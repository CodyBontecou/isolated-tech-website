import { Command } from 'commander';
import { clearCredentials, isAuthenticated, getCredentials } from '../lib/config.js';
import { output, success, info, isJsonMode } from '../lib/output.js';

export const logoutCommand = new Command('logout')
  .description('Sign out from isolated.tech')
  .action(() => {
    if (!isAuthenticated()) {
      if (isJsonMode()) {
        output({ success: true, message: 'Not logged in' });
      } else {
        info('Not logged in');
      }
      return;
    }
    
    const creds = getCredentials();
    const email = creds.email;
    
    clearCredentials();
    
    if (isJsonMode()) {
      output({ success: true, message: 'Logged out', email });
    } else {
      success(`Logged out from ${email}`);
    }
  });
