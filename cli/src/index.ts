#!/usr/bin/env node

import { Command } from 'commander';
import { setJsonMode } from './lib/output.js';
import { doctorCommand } from './commands/doctor.js';
import { statusCommand } from './commands/status.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { initCommand } from './commands/init.js';
import { publishCommand } from './commands/publish.js';
import { appsCommand } from './commands/apps.js';
import { ntfyCommand } from './commands/ntfy.js';
import { screenshotsCommand } from './commands/screenshots.js';
import { blogCommand } from './commands/blog.js';

const program = new Command();

program
  .name('isolated')
  .description('CLI for isolated.tech - publish macOS apps with Sparkle auto-updates')
  .version('0.1.0')
  .option('--json', 'Output in JSON format (for scripting and AI agents)')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) {
      setJsonMode(true);
    }
  });

// Discovery commands
program.addCommand(doctorCommand);
program.addCommand(statusCommand);

// Auth commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);

// App management
program.addCommand(initCommand);
program.addCommand(appsCommand);

// Publishing
program.addCommand(publishCommand);

// Alerting
program.addCommand(ntfyCommand);

// Screenshots
program.addCommand(screenshotsCommand);

// Blog
program.addCommand(blogCommand);

// Default action (no command) - show status
program.action(async () => {
  // If no command given, run doctor
  await doctorCommand.parseAsync([], { from: 'user' });
});

program.parse();
