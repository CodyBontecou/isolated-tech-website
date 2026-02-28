import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, createMockFetch, mockEnv, fixtures } from '../mocks/index.js';

// Mock fs
const mockFS = createMockFS();
vi.mock('fs', () => ({
  readFileSync: mockFS.readFileSync,
  writeFileSync: mockFS.writeFileSync,
  mkdirSync: mockFS.mkdirSync,
  existsSync: mockFS.existsSync,
}));

vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

// Mock fetch
const mockFetchHelper = createMockFetch();
const originalFetch = global.fetch;

// Capture process.exit calls
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit(${code})`);
});

// Mock console
const mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('whoami command', () => {
  let restoreEnv: () => void;
  
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockFetchHelper.reset();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
    mockExit.mockClear();
    global.fetch = mockFetchHelper.fetch;
    restoreEnv = mockEnv({
      ISOLATED_API_URL: 'https://test.api.com',
      ISOLATED_API_KEY: undefined,
    });
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
    restoreEnv();
  });

  describe('when not authenticated', () => {
    it('should exit with error', async () => {
      const { whoamiCommand } = await import('../../src/commands/whoami.js');
      
      await expect(whoamiCommand.parseAsync([]))
        .rejects.toThrow(/process\.exit/);
      
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('when authenticated', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
      }));
    });

    it('should display user info on success', async () => {
      mockFetchHelper.addResponse(200, fixtures.user);
      
      const { whoamiCommand } = await import('../../src/commands/whoami.js');
      await whoamiCommand.parseAsync([]);
      
      expect(mockConsole.log).toHaveBeenCalled();
      const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
      expect(calls).toContain('test@example.com');
    });

    it('should call whoami API endpoint', async () => {
      mockFetchHelper.addResponse(200, fixtures.user);
      
      const { whoamiCommand } = await import('../../src/commands/whoami.js');
      await whoamiCommand.parseAsync([]);
      
      expect(mockFetchHelper.calls).toHaveLength(1);
      expect(mockFetchHelper.calls[0].url).toContain('/api/cli/whoami');
    });

    it('should handle invalid token', async () => {
      mockFetchHelper.addResponse(401, { error: 'Invalid token' });
      
      const { whoamiCommand } = await import('../../src/commands/whoami.js');
      
      await expect(whoamiCommand.parseAsync([]))
        .rejects.toThrow(/process\.exit/);
      
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should include API key header', async () => {
      mockFetchHelper.addResponse(200, fixtures.user);
      
      const { whoamiCommand } = await import('../../src/commands/whoami.js');
      await whoamiCommand.parseAsync([]);
      
      const headers = mockFetchHelper.calls[0].options.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('valid_token');
    });
  });
});
