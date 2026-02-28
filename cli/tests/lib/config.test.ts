import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, mockEnv } from '../mocks/index.js';

// Mock fs module
const mockFS = createMockFS();
vi.mock('fs', () => ({
  readFileSync: mockFS.readFileSync,
  writeFileSync: mockFS.writeFileSync,
  mkdirSync: mockFS.mkdirSync,
  existsSync: mockFS.existsSync,
}));

// Mock os.homedir
vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
  });

  describe('getConfig', () => {
    it('should return empty object when no config file exists', async () => {
      const { getConfig } = await import('../../src/lib/config.js');
      const config = getConfig();
      expect(config).toEqual({});
    });

    it('should parse existing config file', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        apiUrl: 'https://custom.api.com',
        ntfyTopic: 'my-topic',
      }));
      
      const { getConfig } = await import('../../src/lib/config.js');
      const config = getConfig();
      
      expect(config.apiUrl).toBe('https://custom.api.com');
      expect(config.ntfyTopic).toBe('my-topic');
    });

    it('should return empty object on invalid JSON', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', 'not valid json{');
      
      const { getConfig } = await import('../../src/lib/config.js');
      const config = getConfig();
      
      expect(config).toEqual({});
    });
  });

  describe('saveConfig', () => {
    it('should create config directory if it does not exist', async () => {
      const { saveConfig } = await import('../../src/lib/config.js');
      
      saveConfig({ apiUrl: 'https://test.com' });
      
      expect(mockFS.mkdirSync).toHaveBeenCalledWith(
        '/home/testuser/.isolated',
        expect.objectContaining({ recursive: true })
      );
    });

    it('should write config with proper permissions', async () => {
      mockFS.dirs.add('/home/testuser/.isolated');
      
      const { saveConfig } = await import('../../src/lib/config.js');
      
      saveConfig({ apiUrl: 'https://test.com' });
      
      expect(mockFS.writeFileSync).toHaveBeenCalledWith(
        '/home/testuser/.isolated/config.json',
        expect.stringContaining('https://test.com'),
        expect.objectContaining({ mode: 0o600 })
      );
    });
  });

  describe('getCredentials', () => {
    it('should return empty object when no credentials file exists', async () => {
      const { getCredentials } = await import('../../src/lib/config.js');
      const creds = getCredentials();
      expect(creds).toEqual({});
    });

    it('should parse existing credentials file', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'abc123',
        userId: 'user_123',
        email: 'test@example.com',
      }));
      
      const { getCredentials } = await import('../../src/lib/config.js');
      const creds = getCredentials();
      
      expect(creds.token).toBe('abc123');
      expect(creds.userId).toBe('user_123');
      expect(creds.email).toBe('test@example.com');
    });
  });

  describe('saveCredentials', () => {
    it('should write credentials with secure permissions', async () => {
      mockFS.dirs.add('/home/testuser/.isolated');
      
      const { saveCredentials } = await import('../../src/lib/config.js');
      
      saveCredentials({
        token: 'secret_token',
        userId: 'user_123',
        email: 'test@example.com',
      });
      
      expect(mockFS.writeFileSync).toHaveBeenCalledWith(
        '/home/testuser/.isolated/credentials.json',
        expect.stringContaining('secret_token'),
        expect.objectContaining({ mode: 0o600 })
      );
    });
  });

  describe('clearCredentials', () => {
    it('should write empty object to credentials file', async () => {
      mockFS.dirs.add('/home/testuser/.isolated');
      
      const { clearCredentials } = await import('../../src/lib/config.js');
      
      clearCredentials();
      
      expect(mockFS.writeFileSync).toHaveBeenCalledWith(
        '/home/testuser/.isolated/credentials.json',
        '{}',
        expect.objectContaining({ mode: 0o600 })
      );
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token exists', async () => {
      const { isAuthenticated } = await import('../../src/lib/config.js');
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true when valid token exists', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
      }));
      
      const { isAuthenticated } = await import('../../src/lib/config.js');
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when token is expired', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'expired_token',
        expiresAt: pastDate,
      }));
      
      const { isAuthenticated } = await import('../../src/lib/config.js');
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true when token is not yet expired', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        expiresAt: futureDate,
      }));
      
      const { isAuthenticated } = await import('../../src/lib/config.js');
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('getToken', () => {
    it('should return token from credentials file', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'file_token',
      }));
      
      const { getToken } = await import('../../src/lib/config.js');
      expect(getToken()).toBe('file_token');
    });

    it('should fall back to ISOLATED_API_KEY env var', async () => {
      const restore = mockEnv({ ISOLATED_API_KEY: 'env_token' });
      
      try {
        const { getToken } = await import('../../src/lib/config.js');
        expect(getToken()).toBe('env_token');
      } finally {
        restore();
      }
    });

    it('should prefer credentials file over env var', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'file_token',
      }));
      const restore = mockEnv({ ISOLATED_API_KEY: 'env_token' });
      
      try {
        const { getToken } = await import('../../src/lib/config.js');
        expect(getToken()).toBe('file_token');
      } finally {
        restore();
      }
    });

    it('should return undefined when no token available', async () => {
      const restore = mockEnv({ ISOLATED_API_KEY: undefined });
      
      try {
        const { getToken } = await import('../../src/lib/config.js');
        expect(getToken()).toBeUndefined();
      } finally {
        restore();
      }
    });
  });

  describe('API_URL', () => {
    it('should default to https://isolated.tech', async () => {
      const restore = mockEnv({ ISOLATED_API_URL: undefined });
      
      try {
        const { API_URL } = await import('../../src/lib/config.js');
        expect(API_URL).toBe('https://isolated.tech');
      } finally {
        restore();
      }
    });

    it('should use ISOLATED_API_URL env var when set', async () => {
      const restore = mockEnv({ ISOLATED_API_URL: 'http://localhost:3000' });
      
      try {
        // Force re-import to pick up new env var
        vi.resetModules();
        const { API_URL } = await import('../../src/lib/config.js');
        expect(API_URL).toBe('http://localhost:3000');
      } finally {
        restore();
      }
    });
  });
});
