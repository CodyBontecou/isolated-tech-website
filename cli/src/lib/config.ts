import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.isolated');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

export const API_URL = process.env.ISOLATED_API_URL || 'https://isolated.tech';

export interface Config {
  apiUrl?: string;
  ntfyTopic?: string;
}

export interface Credentials {
  token?: string;
  userId?: string;
  email?: string;
  expiresAt?: string;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function getConfig(): Config {
  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function getCredentials(): Credentials {
  try {
    const data = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function saveCredentials(creds: Credentials): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
  try {
    writeFileSync(CREDENTIALS_FILE, '{}', { mode: 0o600 });
  } catch {
    // Ignore if file doesn't exist
  }
}

export function isAuthenticated(): boolean {
  const creds = getCredentials();
  if (!creds.token) return false;
  
  // Check expiry if set
  if (creds.expiresAt) {
    const expiry = new Date(creds.expiresAt);
    if (expiry < new Date()) return false;
  }
  
  return true;
}

export function getToken(): string | undefined {
  // Credentials file takes precedence (user explicitly logged in)
  const creds = getCredentials();
  if (creds.token) {
    return creds.token;
  }
  
  // Fall back to environment variable (for CI)
  if (process.env.ISOLATED_API_KEY) {
    return process.env.ISOLATED_API_KEY;
  }
  
  return undefined;
}
