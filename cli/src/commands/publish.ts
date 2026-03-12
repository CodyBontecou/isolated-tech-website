import { Command } from 'commander';
import ora from 'ora';
import { readFileSync, statSync } from 'fs';
import { basename } from 'path';
import { isAuthenticated } from '../lib/config.js';
import { detectXcodeProject, findReleaseZip, parseChangelog, deriveSlug, bumpBuildNumber } from '../lib/xcode.js';
import { signForSparkle, canSign } from '../lib/sparkle.js';
import { api } from '../lib/api.js';
import { output, success, error, warn, info, banner, isJsonMode } from '../lib/output.js';

interface PublishOptions {
  zip?: string;
  notes?: string;
  appVersion?: string;
  build?: string;
  slug?: string;
  bump?: boolean;
  dryRun?: boolean;
}

export const publishCommand = new Command('publish')
  .description('Publish a release to isolated.tech')
  .option('--zip <path>', 'Path to the .zip file (auto-detected if not provided)')
  .option('--notes <text>', 'Release notes (extracted from CHANGELOG.md if not provided)')
  .option('-V, --app-version <version>', 'Version string (read from Xcode project if not provided)')
  .option('--build <number>', 'Build number (read from Xcode project if not provided)')
  .option('--slug <slug>', 'App slug (derived from project if not provided)')
  .option('--bump', 'Bump build number after publish', true)
  .option('--no-bump', 'Do not bump build number after publish')
  .option('--dry-run', 'Show what would be published without actually publishing')
  .action(async (options: PublishOptions) => {
    // Check auth
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }
    
    if (!isJsonMode()) {
      banner('isolated publish');
    }
    
    // Step 1: Gather info
    const spinner = isJsonMode() ? null : ora('Gathering project info...').start();
    
    // Detect project
    const project = detectXcodeProject();
    if (!project && (!options.appVersion || !options.build || !options.slug)) {
      spinner?.fail('No Xcode project found');
      error('no_project', 'No Xcode project found', 'Run from a project directory or provide --version, --build, --slug');
      process.exit(1);
    }
    
    // Determine values (CLI args override auto-detected)
    const version = options.appVersion || project?.marketingVersion;
    const build = options.build || project?.buildNumber;
    const slug = options.slug || (project ? deriveSlug(project) : undefined);
    
    if (!version || !build || !slug) {
      spinner?.fail('Missing required info');
      error('missing_info', 'Could not determine version, build, or slug', 
        'Provide --version, --build, and --slug flags');
      process.exit(1);
    }
    
    // Find zip
    const zipPath = options.zip || findReleaseZip();
    if (!zipPath) {
      spinner?.fail('No .zip file found');
      error('no_zip', 'No .zip file found in current directory', 
        'Build your app or provide --zip <path>');
      process.exit(1);
    }
    
    // Get file info
    const zipStats = statSync(zipPath);
    const zipFilename = basename(zipPath);
    
    // Get release notes
    const notes = options.notes || parseChangelog() || 'Bug fixes and improvements.';
    
    spinner?.succeed('Project info gathered');
    
    if (!isJsonMode()) {
      info(`  App: ${slug}`);
      info(`  Version: ${version} (build ${build})`);
      info(`  File: ${zipFilename} (${Math.round(zipStats.size / 1024 / 1024)}MB)`);
    }
    
    // Step 2: Sign the zip
    const signSpinner = isJsonMode() ? null : ora('Signing for Sparkle...').start();
    
    if (!canSign()) {
      signSpinner?.fail('Cannot sign');
      error('no_signing', 'No Sparkle signing capability', 
        'Set up EdDSA keys: https://sparkle-project.org/documentation/eddsa-migration/');
      process.exit(1);
    }
    
    const signResult = await signForSparkle(zipPath);
    if (!signResult) {
      signSpinner?.fail('Signing failed');
      error('signing_failed', 'Failed to sign the zip file');
      process.exit(1);
    }
    
    signSpinner?.succeed('Signed for Sparkle');
    
    // Step 3: Verify app exists
    const appSpinner = isJsonMode() ? null : ora('Verifying app...').start();
    
    const appResponse = await api.getApp(slug);
    if (!appResponse.success || !appResponse.data) {
      appSpinner?.fail('App not found');
      error('app_not_found', `App "${slug}" not found on isolated.tech`, 
        'Run: isolated init to register your app');
      process.exit(1);
    }
    
    appSpinner?.succeed(`App: ${appResponse.data.name}`);
    
    // Dry run - stop here
    if (options.dryRun) {
      if (isJsonMode()) {
        output({
          success: true,
          dryRun: true,
          app: slug,
          version,
          build: parseInt(build, 10),
          file: zipFilename,
          fileSize: zipStats.size,
          signature: signResult.signature.substring(0, 20) + '...',
          notes: notes.substring(0, 100) + (notes.length > 100 ? '...' : ''),
        });
      } else {
        console.log();
        warn('Dry run - nothing was uploaded');
        info('Would publish:');
        info(`  Version: ${version} (build ${build})`);
        info(`  File: ${zipFilename}`);
        info(`  Notes: ${notes.substring(0, 50)}...`);
      }
      return;
    }
    
    // Step 4: Get presigned upload URL
    const presignSpinner = isJsonMode() ? null : ora('Preparing upload...').start();
    
    const presignResponse = await api.getPresignedUploadUrl(slug, version, zipFilename);
    if (!presignResponse.success || !presignResponse.data) {
      presignSpinner?.fail('Failed to prepare upload');
      error('presign_failed', presignResponse.message || 'Failed to get upload URL');
      process.exit(1);
    }
    
    const { r2Key } = presignResponse.data;
    presignSpinner?.succeed('Upload prepared');
    
    // Step 5: Upload file
    const uploadSpinner = isJsonMode() ? null : ora('Uploading...').start();
    
    const fileBuffer = readFileSync(zipPath);
    const fileData = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    const uploadResponse = await api.uploadFile(slug, r2Key, fileData, zipFilename);
    
    if (!uploadResponse.success) {
      uploadSpinner?.fail('Upload failed');
      error('upload_failed', uploadResponse.message || 'Upload failed');
      process.exit(1);
    }
    
    uploadSpinner?.succeed('Uploaded');
    
    // Step 6: Confirm upload and create version
    const confirmSpinner = isJsonMode() ? null : ora('Creating version...').start();
    
    const confirmResponse = await api.confirmUpload(slug, {
      version,
      buildNumber: parseInt(build, 10),
      r2Key,
      fileSize: zipStats.size,
      signature: signResult.signature,
      releaseNotes: notes,
      minOsVersion: '14.0',
    });
    
    if (!confirmResponse.success) {
      confirmSpinner?.fail('Failed to create version');
      error('version_failed', confirmResponse.message || 'Failed to create version');
      process.exit(1);
    }
    
    confirmSpinner?.succeed('Version created');
    
    // Step 7: Bump build number
    let newBuild: string | null = null;
    if (options.bump !== false && project) {
      const bumpSpinner = isJsonMode() ? null : ora('Bumping build number...').start();
      newBuild = bumpBuildNumber();
      if (newBuild) {
        bumpSpinner?.succeed(`Build number: ${build} → ${newBuild}`);
      } else {
        bumpSpinner?.warn('Could not bump build number');
      }
    }
    
    // Success!
    if (isJsonMode()) {
      output({
        success: true,
        app: slug,
        version,
        build: parseInt(build, 10),
        newBuild: newBuild ? parseInt(newBuild, 10) : undefined,
        url: `https://isolated.tech/apps/${slug}`,
        appcastUrl: `https://isolated.tech/appcast/${slug}.xml`,
      });
    } else {
      console.log();
      success('Published!', {
        app: slug,
        version: `${version} (build ${build})`,
        url: `https://isolated.tech/apps/${slug}`,
      });
    }
  });
