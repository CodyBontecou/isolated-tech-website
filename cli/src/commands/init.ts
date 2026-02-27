import { Command } from 'commander';
import ora from 'ora';
import { isAuthenticated } from '../lib/config.js';
import { detectXcodeProject, deriveSlug } from '../lib/xcode.js';
import { api } from '../lib/api.js';
import { output, success, error, info, banner, isJsonMode } from '../lib/output.js';

export const initCommand = new Command('init')
  .description('Register your app with isolated.tech (auto-detects project)')
  .option('--slug <slug>', 'App slug (derived from project if not provided)')
  .option('--name <name>', 'App name (derived from project if not provided)')
  .action(async (options: { slug?: string; name?: string }) => {
    // Check auth
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      process.exit(1);
    }
    
    if (!isJsonMode()) {
      banner('isolated init');
    }
    
    // Detect project
    const spinner = isJsonMode() ? null : ora('Detecting project...').start();
    
    const project = detectXcodeProject();
    if (!project) {
      spinner?.fail('No Xcode project found');
      error('no_project', 'No Xcode project found', 'Run from a directory with .xcodeproj or .xcworkspace');
      process.exit(1);
    }
    
    const slug = options.slug || deriveSlug(project);
    const name = options.name || project.name;
    const bundleId = project.bundleId;
    
    spinner?.succeed('Project detected');
    
    if (!isJsonMode()) {
      info(`  Name: ${name}`);
      info(`  Slug: ${slug}`);
      if (bundleId) {
        info(`  Bundle ID: ${bundleId}`);
      }
    }
    
    // Check if app already exists
    const checkSpinner = isJsonMode() ? null : ora('Checking if app exists...').start();
    
    const existingApp = await api.getApp(slug);
    if (existingApp.success && existingApp.data) {
      checkSpinner?.succeed('App already registered');
      
      if (isJsonMode()) {
        output({
          success: true,
          message: 'App already registered',
          app: {
            slug: existingApp.data.slug,
            name: existingApp.data.name,
          },
        });
      } else {
        success(`App "${existingApp.data.name}" is already registered`);
        info(`  URL: https://isolated.tech/apps/${existingApp.data.slug}`);
      }
      return;
    }
    
    checkSpinner?.stop();
    
    // Register app
    const registerSpinner = isJsonMode() ? null : ora('Registering app...').start();
    
    const response = await api.registerApp({
      bundleId: bundleId || slug,
      name,
      slug,
    });
    
    if (!response.success || !response.data) {
      registerSpinner?.fail('Registration failed');
      error('register_failed', response.message || 'Failed to register app');
      process.exit(1);
    }
    
    registerSpinner?.succeed('App registered');
    
    if (isJsonMode()) {
      output({
        success: true,
        message: 'App registered',
        app: {
          id: response.data.id,
          slug: response.data.slug,
          name: response.data.name,
        },
        url: `https://isolated.tech/apps/${response.data.slug}`,
      });
    } else {
      console.log();
      success(`Registered "${response.data.name}"`, {
        slug: response.data.slug,
        url: `https://isolated.tech/apps/${response.data.slug}`,
      });
      console.log();
      info('Next: Build your app and run: isolated publish');
    }
  });
