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
  .action(async (slug: string, options: {
    name?: string;
    tagline?: string;
    description?: string;
    publish?: boolean;
    unpublish?: boolean;
    platforms?: string;
  }) => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }

    // Build update payload
    const updates: {
      name?: string;
      tagline?: string;
      description?: string;
      is_published?: boolean;
      platforms?: string[];
    } = {};

    if (options.name) updates.name = options.name;
    if (options.tagline) updates.tagline = options.tagline;
    if (options.description) updates.description = options.description;
    if (options.publish) updates.is_published = true;
    if (options.unpublish) updates.is_published = false;
    if (options.platforms) updates.platforms = options.platforms.split(',').map(p => p.trim());

    if (Object.keys(updates).length === 0) {
      error('no_updates', 'No updates specified', 'Use --name, --tagline, --description, --publish, or --unpublish');
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
