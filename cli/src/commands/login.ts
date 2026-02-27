import { Command } from 'commander';
import open from 'open';
import ora from 'ora';
import chalk from 'chalk';
import { api } from '../lib/api.js';
import { saveCredentials, isAuthenticated, getCredentials, clearCredentials, API_URL } from '../lib/config.js';
import { output, success, error, info, banner, isJsonMode } from '../lib/output.js';

export const loginCommand = new Command('login')
  .description('Authenticate with isolated.tech')
  .option('--force', 'Force re-authentication even if already logged in')
  .action(async (options: { force?: boolean }) => {
    // Check if already logged in and token is valid
    if (isAuthenticated() && !options.force) {
      // Verify the token actually works
      const verifyResponse = await api.whoami();
      if (verifyResponse.success && verifyResponse.data) {
        if (isJsonMode()) {
          output({ success: true, message: 'Already authenticated', email: verifyResponse.data.email });
        } else {
          info(`Already logged in as ${verifyResponse.data.email}`);
          info('Run: isolated logout to sign out first');
        }
        return;
      }
      // Token is invalid, clear it and continue with login
      clearCredentials();
    }
    
    if (!isJsonMode()) {
      banner('isolated login');
    }
    
    // Step 1: Initiate device auth
    const spinner = isJsonMode() ? null : ora('Initiating authentication...').start();
    
    const initResponse = await api.initiateDeviceAuth();
    
    if (!initResponse.success || !initResponse.data) {
      spinner?.fail('Failed to initiate authentication');
      error('auth_init_failed', initResponse.message || 'Failed to start auth flow', 'Check your internet connection');
      process.exit(1);
    }
    
    const { deviceCode, userCode, verificationUrl } = initResponse.data;
    
    spinner?.stop();
    
    // Step 2: Open browser and show code
    if (!isJsonMode()) {
      console.log();
      console.log(chalk.cyan('  Opening browser for authentication...'));
      console.log();
      console.log(chalk.bold('  Your code: ') + chalk.yellow.bold(userCode));
      console.log();
      console.log(chalk.gray('  Enter this code in your browser to complete login.'));
      console.log(chalk.gray(`  URL: ${verificationUrl}`));
      console.log();
    }
    
    // Open the browser
    try {
      await open(verificationUrl);
    } catch {
      if (!isJsonMode()) {
        info(`Could not open browser. Visit: ${verificationUrl}`);
      }
    }
    
    // Step 3: Poll for completion
    const pollSpinner = isJsonMode() ? null : ora('Waiting for authentication...').start();
    
    const startTime = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    const pollInterval = 2000; // 2 seconds
    
    while (Date.now() - startTime < timeout) {
      await sleep(pollInterval);
      
      const pollResponse = await api.pollDeviceAuth(deviceCode, userCode);
      
      if (!pollResponse.success) {
        // Network error, keep trying
        continue;
      }
      
      const status = pollResponse.data?.status;
      
      if (status === 'complete' && pollResponse.data?.token) {
        // Success!
        pollSpinner?.succeed('Authenticated!');
        
        const { token, user } = pollResponse.data;
        
        saveCredentials({
          token,
          userId: user?.id,
          email: user?.email,
        });
        
        if (isJsonMode()) {
          output({
            success: true,
            message: 'Authentication successful',
            email: user?.email,
          });
        } else {
          console.log();
          success(`Logged in as ${user?.email}`);
        }
        
        return;
      }
      
      if (status === 'expired') {
        pollSpinner?.fail('Authentication expired');
        error('auth_expired', 'Authentication code expired', 'Run: isolated login to try again');
        process.exit(1);
      }
      
      // status === 'pending', keep polling
    }
    
    // Timeout
    pollSpinner?.fail('Authentication timed out');
    error('auth_timeout', 'Authentication timed out', 'Run: isolated login to try again');
    process.exit(1);
  });

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
