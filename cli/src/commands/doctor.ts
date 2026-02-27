import { Command } from 'commander';
import { isAuthenticated, getCredentials } from '../lib/config.js';
import { detectXcodeProject, findReleaseZip, parseChangelog, deriveSlug } from '../lib/xcode.js';
import { getSigningInfo, canSign } from '../lib/sparkle.js';
import { api } from '../lib/api.js';
import { output, success, error, info, banner, isJsonMode } from '../lib/output.js';
import { statSync } from 'fs';

interface DoctorResult {
  ready: boolean;
  authenticated: boolean;
  user?: { email: string };
  project: {
    detected: boolean;
    path?: string;
    name?: string;
    type?: string;
    schemes?: string[];
    bundleId?: string;
    version?: string;
    build?: string;
  };
  app: {
    registered: boolean;
    slug?: string;
    name?: string;
    suggestedSlug?: string;
  };
  release: {
    ready: boolean;
    zipFile?: string;
    zipSize?: number;
    changelog?: string;
    missing: string[];
    hints: string[];
  };
  signing: {
    available: boolean;
    method?: string;
    source?: string;
  };
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose project and show what\'s needed to publish')
  .action(async () => {
    const result = await diagnose();
    
    if (isJsonMode()) {
      output(result);
      return;
    }
    
    // Pretty print for humans
    banner('isolated doctor');
    
    // Auth
    if (result.authenticated) {
      success(`Authenticated as ${result.user?.email}`);
    } else {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
    }
    
    console.log();
    
    // Project
    if (result.project.detected) {
      success(`Xcode project: ${result.project.name}`);
      info(`  Path: ${result.project.path}`);
      info(`  Version: ${result.project.version || 'unknown'} (build ${result.project.build || 'unknown'})`);
      if (result.project.bundleId) {
        info(`  Bundle ID: ${result.project.bundleId}`);
      }
    } else {
      error('no_project', 'No Xcode project found', 'Run from a directory with .xcodeproj or .xcworkspace');
    }
    
    console.log();
    
    // Signing
    if (result.signing.available) {
      success(`Sparkle signing: ${result.signing.method} (${result.signing.source})`);
    } else {
      error('no_signing', 'No Sparkle signing key found', 'Run: sparkle generate_keys');
    }
    
    console.log();
    
    // App registration
    if (result.app.registered) {
      success(`App registered: ${result.app.name} (${result.app.slug})`);
    } else if (result.app.suggestedSlug) {
      info(`App not registered. Suggested slug: ${result.app.suggestedSlug}`);
      info('  Run: isolated init');
    }
    
    console.log();
    
    // Release readiness
    if (result.release.ready) {
      success('Ready to publish!');
      info(`  Zip: ${result.release.zipFile}`);
      if (result.release.changelog) {
        info(`  Changelog: ${result.release.changelog.split('\n')[0]}...`);
      }
    } else {
      error('not_ready', 'Not ready to publish');
      result.release.missing.forEach(m => info(`  Missing: ${m}`));
      result.release.hints.forEach(h => info(`  → ${h}`));
    }
    
    console.log();
    
    if (result.ready) {
      success('All checks passed! Run: isolated publish');
    }
  });

async function diagnose(): Promise<DoctorResult> {
  const result: DoctorResult = {
    ready: false,
    authenticated: false,
    project: { detected: false },
    app: { registered: false },
    release: { ready: false, missing: [], hints: [] },
    signing: { available: false },
  };
  
  // Check authentication
  result.authenticated = isAuthenticated();
  if (result.authenticated) {
    const whoami = await api.whoami();
    if (whoami.success && whoami.data) {
      result.user = { email: whoami.data.email };
    }
  }
  
  // Check project
  const project = detectXcodeProject();
  if (project) {
    result.project = {
      detected: true,
      path: project.path,
      name: project.name,
      type: project.type,
      schemes: project.schemes,
      bundleId: project.bundleId,
      version: project.marketingVersion,
      build: project.buildNumber,
    };
    
    // Derive suggested slug
    const suggestedSlug = deriveSlug(project);
    result.app.suggestedSlug = suggestedSlug;
    
    // Check if app is registered (only if authenticated)
    if (result.authenticated) {
      const appResponse = await api.getApp(suggestedSlug);
      if (appResponse.success && appResponse.data) {
        result.app = {
          registered: true,
          slug: appResponse.data.slug,
          name: appResponse.data.name,
        };
      }
    }
  }
  
  // Check signing
  const signingInfo = getSigningInfo();
  result.signing = {
    available: signingInfo.available,
    method: signingInfo.method,
    source: signingInfo.toolPath || signingInfo.keySource,
  };
  
  // Check release readiness
  const zipFile = findReleaseZip();
  const changelog = parseChangelog();
  
  if (zipFile) {
    const stats = statSync(zipFile);
    result.release.zipFile = zipFile;
    result.release.zipSize = stats.size;
  } else {
    result.release.missing.push('zip_file');
    result.release.hints.push('Build your app or provide a .zip file');
  }
  
  if (changelog) {
    result.release.changelog = changelog;
  }
  
  if (!result.authenticated) {
    result.release.missing.push('authentication');
    result.release.hints.push("Run 'isolated login' to authenticate");
  }
  
  if (!result.project.detected) {
    result.release.missing.push('xcode_project');
    result.release.hints.push('Run from a directory with an Xcode project');
  }
  
  if (!result.signing.available) {
    result.release.missing.push('signing_key');
    result.release.hints.push('Set up Sparkle EdDSA signing keys');
  }
  
  if (!result.app.registered && result.project.detected) {
    result.release.missing.push('app_registration');
    result.release.hints.push("Run 'isolated init' to register your app");
  }
  
  // Determine overall readiness
  result.release.ready = result.release.missing.length === 0;
  result.ready = result.release.ready;
  
  return result;
}
