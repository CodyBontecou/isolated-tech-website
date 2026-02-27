import { Command } from 'commander';
import { isAuthenticated, getCredentials } from '../lib/config.js';
import { detectXcodeProject, findReleaseZip, parseChangelog, deriveSlug } from '../lib/xcode.js';
import { canSign } from '../lib/sparkle.js';
import { output, banner, isJsonMode } from '../lib/output.js';
import { statSync } from 'fs';
import chalk from 'chalk';

interface StatusResult {
  authenticated: boolean;
  email?: string;
  project?: {
    name: string;
    path: string;
    type: string;
    version?: string;
    build?: string;
    bundleId?: string;
    slug: string;
  };
  release?: {
    zipFile: string;
    zipSize: number;
    hasChangelog: boolean;
  };
  canSign: boolean;
}

export const statusCommand = new Command('status')
  .description('Show current project and authentication status')
  .action(async () => {
    const result: StatusResult = {
      authenticated: isAuthenticated(),
      canSign: canSign(),
    };
    
    if (result.authenticated) {
      const creds = getCredentials();
      result.email = creds.email;
    }
    
    const project = detectXcodeProject();
    if (project) {
      result.project = {
        name: project.name,
        path: project.path,
        type: project.type,
        version: project.marketingVersion,
        build: project.buildNumber,
        bundleId: project.bundleId,
        slug: deriveSlug(project),
      };
    }
    
    const zipFile = findReleaseZip();
    if (zipFile) {
      const stats = statSync(zipFile);
      result.release = {
        zipFile,
        zipSize: stats.size,
        hasChangelog: parseChangelog() !== null,
      };
    }
    
    if (isJsonMode()) {
      output(result);
      return;
    }
    
    // Pretty print
    banner('isolated status');
    
    // Auth
    console.log(chalk.cyan('Authentication'));
    if (result.authenticated) {
      console.log(chalk.green('  ✓'), `Logged in as ${result.email}`);
    } else {
      console.log(chalk.red('  ✗'), 'Not logged in');
    }
    
    console.log();
    
    // Project
    console.log(chalk.cyan('Project'));
    if (result.project) {
      console.log(chalk.green('  ✓'), result.project.name);
      console.log(chalk.gray('    Path:'), result.project.path);
      console.log(chalk.gray('    Version:'), result.project.version || 'unknown');
      console.log(chalk.gray('    Build:'), result.project.build || 'unknown');
      console.log(chalk.gray('    Slug:'), result.project.slug);
      if (result.project.bundleId) {
        console.log(chalk.gray('    Bundle ID:'), result.project.bundleId);
      }
    } else {
      console.log(chalk.red('  ✗'), 'No Xcode project found');
    }
    
    console.log();
    
    // Signing
    console.log(chalk.cyan('Signing'));
    if (result.canSign) {
      console.log(chalk.green('  ✓'), 'Sparkle signing available');
    } else {
      console.log(chalk.red('  ✗'), 'No signing capability');
    }
    
    console.log();
    
    // Release
    console.log(chalk.cyan('Release'));
    if (result.release) {
      console.log(chalk.green('  ✓'), `Zip: ${result.release.zipFile}`);
      console.log(chalk.gray('    Size:'), `${Math.round(result.release.zipSize / 1024 / 1024)}MB`);
      if (result.release.hasChangelog) {
        console.log(chalk.green('  ✓'), 'CHANGELOG.md found');
      }
    } else {
      console.log(chalk.yellow('  ○'), 'No .zip file found');
    }
    
    console.log();
  });
