import { Command } from 'commander';
import { isAuthenticated, getCredentials } from '../lib/config.js';
import { api } from '../lib/api.js';
import { output, success, error, isJsonMode } from '../lib/output.js';

export const whoamiCommand = new Command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    if (!isAuthenticated()) {
      error('not_authenticated', 'Not logged in', 'Run: isolated login');
      if (isJsonMode()) {
        output({ success: false, error: 'not_authenticated' });
      }
      process.exit(1);
    }
    
    const creds = getCredentials();
    
    // Verify with server
    const response = await api.whoami();
    
    if (!response.success || !response.data) {
      // Token might be invalid
      error('invalid_token', 'Session expired or invalid', 'Run: isolated login');
      if (isJsonMode()) {
        output({ success: false, error: 'invalid_token' });
      }
      process.exit(1);
    }
    
    const user = response.data;
    
    if (isJsonMode()) {
      output({
        success: true,
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } else {
      success(`Logged in as ${user.email}`, {
        id: user.id,
        ...(user.name && { name: user.name }),
      });
    }
  });
