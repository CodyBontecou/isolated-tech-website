import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { isAuthenticated } from '../lib/config.js';
import { api } from '../lib/api.js';
import { output, error, banner, isJsonMode } from '../lib/output.js';

export const appsCommand = new Command('apps')
  .description('Manage your apps');

appsCommand
  .command('list')
  .description('List your registered apps')
  .action(async () => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }
    
    const spinner = isJsonMode() ? null : ora('Fetching apps...').start();
    
    const response = await api.listApps();
    
    if (!response.success || !response.data) {
      spinner?.fail('Failed to fetch apps');
      error('fetch_failed', response.message || 'Failed to fetch apps');
      process.exit(1);
    }
    
    spinner?.stop();
    
    const apps = response.data;
    
    if (isJsonMode()) {
      output({ success: true, apps });
      return;
    }
    
    banner('Your Apps');
    
    if (apps.length === 0) {
      console.log(chalk.gray('  No apps registered yet.'));
      console.log(chalk.gray('  Run: isolated init'));
      return;
    }
    
    for (const app of apps) {
      const status = app.is_published ? chalk.green('●') : chalk.yellow('○');
      console.log(`  ${status} ${chalk.bold(app.name)}`);
      console.log(chalk.gray(`    slug: ${app.slug}`));
      console.log(chalk.gray(`    url: https://isolated.tech/apps/${app.slug}`));
      console.log();
    }
  });

appsCommand
  .command('update <slug>')
  .description('Update app metadata')
  .option('--name <name>', 'App name')
  .option('--tagline <tagline>', 'Short tagline (shown in listings)')
  .option('--description <description>', 'Full description (markdown supported)')
  .option('--publish', 'Make the app publicly visible')
  .option('--unpublish', 'Hide the app from public listings')
  .option('--platforms <platforms>', 'Comma-separated platforms (ios,macos)')
  .option('--privacy-policy <text>', 'Privacy policy content (markdown)')
  .option('--privacy-policy-file <file>', 'Privacy policy from file (markdown)')
  .option('--terms-of-service <text>', 'Terms of service content (markdown)')
  .option('--terms-of-service-file <file>', 'Terms of service from file (markdown)')
  .action(async (slug: string, options: {
    name?: string;
    tagline?: string;
    description?: string;
    publish?: boolean;
    unpublish?: boolean;
    platforms?: string;
    privacyPolicy?: string;
    privacyPolicyFile?: string;
    termsOfService?: string;
    termsOfServiceFile?: string;
  }) => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }

    const fs = await import('fs');
    const path = await import('path');

    // Build update payload
    const updates: {
      name?: string;
      tagline?: string;
      description?: string;
      is_published?: boolean;
      platforms?: string[];
      privacy_policy?: string;
      terms_of_service?: string;
    } = {};

    if (options.name) updates.name = options.name;
    if (options.tagline) updates.tagline = options.tagline;
    if (options.description) updates.description = options.description;
    if (options.publish) updates.is_published = true;
    if (options.unpublish) updates.is_published = false;
    if (options.platforms) updates.platforms = options.platforms.split(',').map(p => p.trim());

    // Handle privacy policy
    if (options.privacyPolicyFile) {
      const filePath = path.resolve(options.privacyPolicyFile);
      if (!fs.existsSync(filePath)) {
        error('file_not_found', `Privacy policy file not found: ${options.privacyPolicyFile}`);
        process.exit(1);
      }
      updates.privacy_policy = fs.readFileSync(filePath, 'utf-8');
    } else if (options.privacyPolicy) {
      updates.privacy_policy = options.privacyPolicy;
    }

    // Handle terms of service
    if (options.termsOfServiceFile) {
      const filePath = path.resolve(options.termsOfServiceFile);
      if (!fs.existsSync(filePath)) {
        error('file_not_found', `Terms of service file not found: ${options.termsOfServiceFile}`);
        process.exit(1);
      }
      updates.terms_of_service = fs.readFileSync(filePath, 'utf-8');
    } else if (options.termsOfService) {
      updates.terms_of_service = options.termsOfService;
    }

    if (Object.keys(updates).length === 0) {
      error('no_updates', 'No updates specified', 'Use --name, --tagline, --description, --publish, --unpublish, --privacy-policy-file, or --terms-of-service-file');
      process.exit(1);
    }

    const spinner = isJsonMode() ? null : ora('Updating app...').start();

    const response = await api.updateApp(slug, updates);

    if (!response.success || !response.data) {
      spinner?.fail('Failed to update app');
      error('update_failed', response.message || 'Failed to update app');
      process.exit(1);
    }

    spinner?.succeed('App updated');

    if (isJsonMode()) {
      output({ success: true, app: response.data });
      return;
    }

    const app = response.data;
    console.log();
    console.log(chalk.bold(`  ${app.name}`));
    console.log(chalk.gray(`  slug: ${app.slug}`));
    if (app.tagline) console.log(chalk.gray(`  tagline: ${app.tagline}`));
    console.log(chalk.gray(`  published: ${app.is_published ? chalk.green('yes') : chalk.yellow('no')}`));
    console.log(chalk.gray(`  url: https://isolated.tech/apps/${app.slug}`));
    console.log();
  });

appsCommand
  .command('publish <slug>')
  .description('Make an app publicly visible on isolated.tech')
  .option('--tagline <tagline>', 'Short tagline (required for first publish)')
  .option('--description <description>', 'Full description')
  .action(async (slug: string, options: { tagline?: string; description?: string }) => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }

    // First, get current app state
    const spinner = isJsonMode() ? null : ora('Fetching app...').start();
    
    const appResponse = await api.getApp(slug);
    
    if (!appResponse.success || !appResponse.data) {
      spinner?.fail('App not found');
      error('not_found', appResponse.message || 'App not found');
      process.exit(1);
    }

    const app = appResponse.data;

    // Check if tagline is needed
    if (!app.tagline && !options.tagline) {
      spinner?.fail('Tagline required');
      error('missing_tagline', 'A tagline is required to publish', 'Use: isolated apps publish <slug> --tagline "Your tagline"');
      process.exit(1);
    }

    if (spinner) spinner.text = 'Publishing app...';

    const updates: { is_published: boolean; tagline?: string; description?: string } = {
      is_published: true,
    };

    if (options.tagline) updates.tagline = options.tagline;
    if (options.description) updates.description = options.description;

    const response = await api.updateApp(slug, updates);

    if (!response.success || !response.data) {
      spinner?.fail('Failed to publish app');
      error('publish_failed', response.message || 'Failed to publish app');
      process.exit(1);
    }

    spinner?.succeed('App published!');

    if (isJsonMode()) {
      output({ success: true, app: response.data });
      return;
    }

    console.log();
    console.log(chalk.green(`  ✓ ${response.data.name} is now live!`));
    console.log(chalk.gray(`    ${chalk.underline(`https://isolated.tech/apps/${slug}`)}`));
    console.log();
  });

appsCommand
  .command('icon <slug> <file>')
  .description('Upload an app icon (PNG, JPEG, or WebP, max 5MB)')
  .action(async (slug: string, file: string) => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }

    // Check file exists
    const fs = await import('fs');
    const path = await import('path');
    
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      error('file_not_found', `File not found: ${file}`);
      process.exit(1);
    }

    const spinner = isJsonMode() ? null : ora('Uploading icon...').start();

    const response = await api.uploadIcon(slug, filePath);

    if (!response.success || !response.data) {
      spinner?.fail('Failed to upload icon');
      error('upload_failed', response.message || 'Failed to upload icon');
      process.exit(1);
    }

    spinner?.succeed('Icon uploaded!');

    if (isJsonMode()) {
      output({ success: true, ...response.data });
      return;
    }

    console.log();
    console.log(chalk.green(`  ✓ Icon uploaded for ${slug}`));
    console.log(chalk.gray(`    Size: ${(response.data.size / 1024).toFixed(1)} KB`));
    console.log(chalk.gray(`    URL: https://isolated.tech${response.data.icon_url}`));
    console.log();
  });

appsCommand
  .command('legal <slug>')
  .description('Upload privacy policy and/or terms of service')
  .option('--privacy <file>', 'Privacy policy markdown file')
  .option('--terms <file>', 'Terms of service markdown file')
  .action(async (slug: string, options: { privacy?: string; terms?: string }) => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }

    if (!options.privacy && !options.terms) {
      error('no_files', 'No files specified', 'Use --privacy <file> and/or --terms <file>');
      process.exit(1);
    }

    const fs = await import('fs');
    const path = await import('path');

    const updates: { privacy_policy?: string; terms_of_service?: string } = {};

    if (options.privacy) {
      const filePath = path.resolve(options.privacy);
      if (!fs.existsSync(filePath)) {
        error('file_not_found', `Privacy policy file not found: ${options.privacy}`);
        process.exit(1);
      }
      updates.privacy_policy = fs.readFileSync(filePath, 'utf-8');
    }

    if (options.terms) {
      const filePath = path.resolve(options.terms);
      if (!fs.existsSync(filePath)) {
        error('file_not_found', `Terms of service file not found: ${options.terms}`);
        process.exit(1);
      }
      updates.terms_of_service = fs.readFileSync(filePath, 'utf-8');
    }

    const spinner = isJsonMode() ? null : ora('Uploading legal pages...').start();

    const response = await api.updateApp(slug, updates);

    if (!response.success || !response.data) {
      spinner?.fail('Failed to upload legal pages');
      error('upload_failed', response.message || 'Failed to upload legal pages');
      process.exit(1);
    }

    spinner?.succeed('Legal pages uploaded!');

    if (isJsonMode()) {
      output({ 
        success: true, 
        app: slug,
        privacy_url: updates.privacy_policy ? `https://isolated.tech/apps/${slug}/privacy` : null,
        terms_url: updates.terms_of_service ? `https://isolated.tech/apps/${slug}/terms` : null,
      });
      return;
    }

    console.log();
    if (updates.privacy_policy) {
      console.log(chalk.green(`  ✓ Privacy policy uploaded`));
      console.log(chalk.gray(`    ${chalk.underline(`https://isolated.tech/apps/${slug}/privacy`)}`));
    }
    if (updates.terms_of_service) {
      console.log(chalk.green(`  ✓ Terms of service uploaded`));
      console.log(chalk.gray(`    ${chalk.underline(`https://isolated.tech/apps/${slug}/terms`)}`));
    }
    console.log();
  });

appsCommand
  .command('versions <slug>')
  .description('List versions for an app')
  .action(async (slug: string) => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }
    
    const spinner = isJsonMode() ? null : ora('Fetching versions...').start();
    
    const response = await api.listVersions(slug);
    
    if (!response.success || !response.data) {
      spinner?.fail('Failed to fetch versions');
      error('fetch_failed', response.message || 'Failed to fetch versions');
      process.exit(1);
    }
    
    spinner?.stop();
    
    const versions = response.data;
    
    if (isJsonMode()) {
      output({ success: true, app: slug, versions });
      return;
    }
    
    banner(`Versions: ${slug}`);
    
    if (versions.length === 0) {
      console.log(chalk.gray('  No versions published yet.'));
      console.log(chalk.gray('  Run: isolated publish'));
      return;
    }
    
    for (const v of versions) {
      const date = new Date(v.created_at).toLocaleDateString();
      console.log(`  ${chalk.bold(v.version)} ${chalk.gray(`(build ${v.build_number})`)}`);
      console.log(chalk.gray(`    Released: ${date}`));
      if (v.release_notes) {
        const preview = v.release_notes.split('\n')[0].substring(0, 60);
        console.log(chalk.gray(`    Notes: ${preview}${v.release_notes.length > 60 ? '...' : ''}`));
      }
      console.log();
    }
  });
