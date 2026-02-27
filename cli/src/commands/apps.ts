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
