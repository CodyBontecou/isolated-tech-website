import { Command } from 'commander';
import { api } from '../lib/api.js';
import {
  getCredentials,
  saveCredentials,
  isAuthenticated,
} from '../lib/config.js';
import {
  output,
  success,
  error,
  info,
  isJsonMode,
} from '../lib/output.js';

export const keysCommand = new Command('keys').description(
  'Manage your isolated.tech API keys'
);

keysCommand
  .command('list')
  .description('List your API keys')
  .action(async () => {
    if (!requireAuth()) return;

    const res = await api.listApiKeys();
    if (!res.success || !res.data) {
      error('list_failed', res.message || 'Failed to list API keys');
      process.exit(1);
    }

    const keys = res.data.keys;

    if (isJsonMode()) {
      output({ success: true, keys });
      return;
    }

    if (keys.length === 0) {
      info('No API keys found.');
      return;
    }

    for (const k of keys) {
      const status = k.isRevoked
        ? 'revoked'
        : k.isExpired
          ? 'expired'
          : 'active';
      console.log(
        `  ${k.keyPrefix}…  ${k.name.padEnd(24)} ${status.padEnd(8)} expires ${formatDate(k.expiresAt)}${
          k.lastUsedAt ? `  last used ${formatDate(k.lastUsedAt)}` : ''
        }`
      );
    }
  });

keysCommand
  .command('rotate')
  .description(
    'Issue a new API key, switch the CLI to it, and revoke the current one'
  )
  .option(
    '-n, --name <name>',
    'Name for the new key (defaults to the current key name or "cli-access")'
  )
  .option(
    '--keep-old',
    'Skip revoking the previous key after rotation'
  )
  .action(async (opts: { name?: string; keepOld?: boolean }) => {
    if (!requireAuth()) return;

    const creds = getCredentials();
    const oldToken = creds.token;
    const oldPrefix = oldToken ? oldToken.substring(0, 8) : null;

    if (process.env.ISOLATED_API_KEY && !oldToken) {
      error(
        'env_var_auth',
        'You are authenticated via ISOLATED_API_KEY env var, not credentials file.',
        'Run `isolated login` first, or rotate the env-var key from the admin UI.'
      );
      process.exit(1);
    }

    // Resolve a name for the new key
    let name = opts.name;
    if (!name && oldPrefix) {
      const existing = await api.listApiKeys();
      const match = existing.data?.keys.find(
        (k) => k.keyPrefix === oldPrefix
      );
      if (match?.name) name = match.name;
    }
    name = name || 'cli-access';

    // 1. Create new key
    const created = await api.createApiKey(name);
    if (!created.success || !created.data) {
      error(
        'create_failed',
        created.message || 'Failed to create new API key'
      );
      process.exit(1);
    }

    const { key: newKey, expiresAt } = created.data;
    const newPrefix = newKey.substring(0, 8);

    // 2. Persist new key locally BEFORE revoking — if revoke fails we still
    //    have a valid key saved, and the user can rerun `keys revoke` manually.
    saveCredentials({
      ...creds,
      token: newKey,
      expiresAt,
    });

    // 3. Revoke the old key (if we know its prefix and the user opted in)
    let revokeWarning: string | null = null;
    if (oldPrefix && !opts.keepOld && oldPrefix !== newPrefix) {
      const revoked = await api.revokeApiKey(oldPrefix);
      if (!revoked.success) {
        revokeWarning =
          revoked.message ||
          `Could not revoke previous key ${oldPrefix}…`;
      }
    }

    if (isJsonMode()) {
      output({
        success: true,
        rotated: true,
        newKeyPrefix: newPrefix,
        expiresAt,
        revokedOldKey: !revokeWarning && !opts.keepOld && !!oldPrefix,
        ...(revokeWarning && { revokeWarning }),
      });
      return;
    }

    success('Rotated API key', {
      'new prefix': `${newPrefix}…`,
      expires: formatDate(expiresAt),
      'old key': opts.keepOld
        ? 'kept active'
        : oldPrefix
          ? `revoked (${oldPrefix}…)`
          : 'unknown',
    });

    if (revokeWarning) {
      console.log();
      info(
        `Warning: ${revokeWarning}. Revoke it manually with: isolated keys revoke ${oldPrefix}`
      );
    }

    if (process.env.ISOLATED_API_KEY) {
      console.log();
      info(
        'You also have ISOLATED_API_KEY set in your shell. Update it to the new key value or unset it so the credentials file takes precedence.'
      );
    }
  });

keysCommand
  .command('revoke <prefix>')
  .description('Revoke an API key by its prefix (first 8 chars)')
  .action(async (prefix: string) => {
    if (!requireAuth()) return;

    const res = await api.revokeApiKey(prefix);
    if (!res.success) {
      error('revoke_failed', res.message || 'Failed to revoke API key');
      process.exit(1);
    }

    if (isJsonMode()) {
      output({ success: true, revoked: prefix });
    } else {
      success(`Revoked key ${prefix}…`);
    }
  });

function requireAuth(): boolean {
  if (isAuthenticated()) return true;
  error('not_authenticated', 'Not logged in', 'Run: isolated login');
  process.exit(1);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}
