import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { getConfig, saveConfig } from '../lib/config.js';
import { 
  sendNotification, 
  generateCloudflareCode, 
  generateSwiftCode 
} from '../lib/ntfy.js';
import { output, success, error, info, banner, isJsonMode, warn } from '../lib/output.js';

export const ntfyCommand = new Command('ntfy')
  .description('Push notifications via ntfy.sh for error alerting');

/**
 * isolated ntfy setup - Configure your ntfy topic
 */
ntfyCommand
  .command('setup')
  .description('Configure your ntfy.sh topic')
  .argument('<topic>', 'Your ntfy.sh topic name')
  .action(async (topic: string) => {
    if (!isJsonMode()) {
      banner('ntfy setup');
    }

    const config = getConfig();
    config.ntfyTopic = topic;
    saveConfig(config);

    if (isJsonMode()) {
      output({ success: true, topic, message: 'ntfy topic configured' });
    } else {
      success(`Configured ntfy topic: ${topic}`);
      console.log();
      info('Subscribe to this topic in the ntfy app on your phone');
      info(`Test it with: ${chalk.cyan('isolated ntfy test')}`);
    }
  });

/**
 * isolated ntfy test - Send a test notification
 */
ntfyCommand
  .command('test')
  .description('Send a test notification')
  .option('-t, --topic <topic>', 'Override configured topic')
  .action(async (options: { topic?: string }) => {
    if (!isJsonMode()) {
      banner('ntfy test');
    }

    const config = getConfig();
    const topic = options.topic || config.ntfyTopic;

    if (!topic) {
      error('no_topic', 'No ntfy topic configured', 'Run: isolated ntfy setup <your-topic>');
      process.exit(1);
    }

    const spinner = isJsonMode() ? null : ora('Sending test notification...').start();

    const result = await sendNotification(topic, 'This is a test notification from isolated CLI', {
      title: 'Test Alert',
      priority: 'default',
      tags: ['test_tube', 'rocket'],
    });

    if (result.success) {
      spinner?.succeed('Test notification sent!');
      if (isJsonMode()) {
        output({ success: true, topic, id: result.id });
      } else {
        info('Check your phone for the notification');
      }
    } else {
      spinner?.fail('Failed to send notification');
      error('send_failed', result.error || 'Unknown error');
      process.exit(1);
    }
  });

/**
 * isolated ntfy send - Send a custom notification
 */
ntfyCommand
  .command('send')
  .description('Send a notification')
  .argument('<message>', 'Message to send')
  .option('-t, --topic <topic>', 'Override configured topic')
  .option('--title <title>', 'Notification title')
  .option('-p, --priority <priority>', 'Priority: min, low, default, high, urgent', 'default')
  .option('--tags <tags>', 'Comma-separated tags/emojis')
  .action(async (message: string, options: { 
    topic?: string; 
    title?: string; 
    priority?: string;
    tags?: string;
  }) => {
    const config = getConfig();
    const topic = options.topic || config.ntfyTopic;

    if (!topic) {
      error('no_topic', 'No ntfy topic configured', 'Run: isolated ntfy setup <your-topic>');
      process.exit(1);
    }

    const spinner = isJsonMode() ? null : ora('Sending notification...').start();

    const result = await sendNotification(topic, message, {
      title: options.title,
      priority: options.priority as 'min' | 'low' | 'default' | 'high' | 'urgent',
      tags: options.tags?.split(',').map(t => t.trim()) || [],
    });

    if (result.success) {
      spinner?.succeed('Notification sent');
      if (isJsonMode()) {
        output({ success: true, topic, id: result.id });
      }
    } else {
      spinner?.fail('Failed to send notification');
      error('send_failed', result.error || 'Unknown error');
      process.exit(1);
    }
  });

/**
 * isolated ntfy init - Generate alerting code for your project
 */
ntfyCommand
  .command('init')
  .description('Generate ntfy alerting code for your project')
  .option('--type <type>', 'Project type: cloudflare, swift, auto', 'auto')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options: { type: string; output?: string }) => {
    if (!isJsonMode()) {
      banner('ntfy init');
    }

    const config = getConfig();
    let projectType = options.type;

    // Auto-detect project type
    if (projectType === 'auto') {
      if (existsSync('wrangler.toml') || existsSync('wrangler.jsonc') || existsSync('wrangler.json')) {
        projectType = 'cloudflare';
      } else if (existsSync('Package.swift') || 
                 [...(readdirSafe('.') || [])].some(f => f.endsWith('.xcodeproj') || f.endsWith('.xcworkspace'))) {
        projectType = 'swift';
      } else {
        error('unknown_project', 'Could not detect project type', 'Use --type cloudflare or --type swift');
        process.exit(1);
      }
    }

    let code: string;
    let defaultOutput: string;
    let setupInstructions: string[];

    switch (projectType) {
      case 'cloudflare':
        code = generateCloudflareCode();
        defaultOutput = 'src/lib/alerts.ts';
        setupInstructions = [
          `Add NTFY_TOPIC to your env: ${chalk.cyan('wrangler secret put NTFY_TOPIC')}`,
          `Import in your worker: ${chalk.cyan("import { alertError } from './lib/alerts'")}`,
          'Use in error handler: alertError(err, env.NTFY_TOPIC, context)',
        ];
        break;

      case 'swift':
        code = generateSwiftCode();
        defaultOutput = 'Sources/Ntfy.swift';
        setupInstructions = [
          'Add NTFY_TOPIC to your scheme environment variables, or',
          `Set topic directly: ${chalk.cyan('Ntfy.send("message", topic: "your-topic")')}`,
          `Usage: ${chalk.cyan('await Ntfy.error(someError, context: "during sync")')}`,
        ];
        break;

      default:
        error('invalid_type', `Unknown project type: ${projectType}`, 'Use: cloudflare, swift');
        process.exit(1);
    }

    const outputPath = options.output || defaultOutput;

    // Check if file exists
    if (existsSync(outputPath) && !options.output) {
      warn(`File already exists: ${outputPath}`);
      if (!isJsonMode()) {
        info('Use --output to specify a different path, or delete the existing file');
      }
      
      if (isJsonMode()) {
        output({ success: false, error: 'file_exists', path: outputPath, code });
      }
      process.exit(1);
    }

    // Ensure directory exists
    const dir = outputPath.split('/').slice(0, -1).join('/');
    if (dir && !existsSync(dir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(outputPath, code);

    if (isJsonMode()) {
      output({ 
        success: true, 
        type: projectType, 
        path: outputPath,
        topic: config.ntfyTopic,
      });
    } else {
      success(`Created ${outputPath}`);
      console.log();
      
      if (config.ntfyTopic) {
        info(`Using configured topic: ${chalk.cyan(config.ntfyTopic)}`);
      } else {
        warn('No topic configured yet');
        info(`Run: ${chalk.cyan('isolated ntfy setup <your-topic>')}`);
      }
      
      console.log();
      info(chalk.bold('Setup:'));
      setupInstructions.forEach(instruction => {
        console.log(chalk.gray('  →'), instruction);
      });
    }
  });

/**
 * isolated ntfy topic - Show configured topic
 */
ntfyCommand
  .command('topic')
  .description('Show configured ntfy topic')
  .action(() => {
    const config = getConfig();
    
    if (isJsonMode()) {
      output({ topic: config.ntfyTopic || null });
    } else {
      if (config.ntfyTopic) {
        console.log(config.ntfyTopic);
      } else {
        error('no_topic', 'No topic configured', 'Run: isolated ntfy setup <your-topic>');
        process.exit(1);
      }
    }
  });

// Helper to safely read directory
function readdirSafe(path: string): string[] | null {
  try {
    const { readdirSync } = require('fs');
    return readdirSync(path);
  } catch {
    return null;
  }
}
