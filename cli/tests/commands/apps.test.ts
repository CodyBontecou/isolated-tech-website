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

describe('apps command', () => {
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

  describe('apps list', () => {
    describe('when not authenticated', () => {
      it('should exit with error', async () => {
        const { appsCommand } = await import('../../src/commands/apps.js');
        
        // Use 'user' to tell Commander these are user-provided args
        await expect(appsCommand.parseAsync(['list'], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });
    });

    describe('when authenticated', () => {
      beforeEach(() => {
        mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
          token: 'valid_token',
        }));
      });

      it('should list apps', async () => {
        mockFetchHelper.addResponse(200, [fixtures.app]);
        
        const { appsCommand } = await import('../../src/commands/apps.js');
        await appsCommand.parseAsync(['list'], { from: 'user' });
        
        expect(mockConsole.log).toHaveBeenCalled();
        const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
        expect(calls).toContain('My App');
      });

      it('should output JSON in JSON mode', async () => {
        mockFetchHelper.addResponse(200, [fixtures.app]);
        
        const { setJsonMode } = await import('../../src/lib/output.js');
        setJsonMode(true);
        
        try {
          const { appsCommand } = await import('../../src/commands/apps.js');
          await appsCommand.parseAsync(['list'], { from: 'user' });
          
          const call = mockConsole.log.mock.calls[0][0];
          const parsed = JSON.parse(call);
          expect(parsed.success).toBe(true);
          expect(parsed.apps).toHaveLength(1);
          expect(parsed.apps[0].slug).toBe('my-app');
        } finally {
          setJsonMode(false);
        }
      });

      it('should handle empty list', async () => {
        mockFetchHelper.addResponse(200, []);
        
        const { appsCommand } = await import('../../src/commands/apps.js');
        await appsCommand.parseAsync(['list'], { from: 'user' });
        
        const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
        expect(calls).toContain('No apps');
      });

      it('should handle API errors', async () => {
        mockFetchHelper.addResponse(500, { error: 'Server error' });
        
        const { appsCommand } = await import('../../src/commands/apps.js');
        
        await expect(appsCommand.parseAsync(['list'], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });
    });
  });

  describe('apps versions', () => {
    describe('when not authenticated', () => {
      it('should exit with error', async () => {
        const { appsCommand } = await import('../../src/commands/apps.js');
        
        await expect(appsCommand.parseAsync(['versions', 'my-app'], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });
    });

    describe('when authenticated', () => {
      beforeEach(() => {
        mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
          token: 'valid_token',
        }));
      });

      it('should list versions for an app', async () => {
        mockFetchHelper.addResponse(200, [
          { id: 'v1', version: '1.0.0', build_number: 1, created_at: '2024-01-01T00:00:00Z' },
          { id: 'v2', version: '1.1.0', build_number: 2, created_at: '2024-01-15T00:00:00Z' },
        ]);
        
        const { appsCommand } = await import('../../src/commands/apps.js');
        await appsCommand.parseAsync(['versions', 'my-app'], { from: 'user' });
        
        const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
        expect(calls).toContain('1.0.0');
        expect(calls).toContain('1.1.0');
      });

      it('should output JSON in JSON mode', async () => {
        mockFetchHelper.addResponse(200, [
          { id: 'v1', version: '1.0.0', build_number: 1, created_at: '2024-01-01T00:00:00Z' },
        ]);
        
        const { setJsonMode } = await import('../../src/lib/output.js');
        setJsonMode(true);
        
        try {
          const { appsCommand } = await import('../../src/commands/apps.js');
          await appsCommand.parseAsync(['versions', 'test-app'], { from: 'user' });
          
          const call = mockConsole.log.mock.calls[0][0];
          const parsed = JSON.parse(call);
          expect(parsed.success).toBe(true);
          expect(parsed.app).toBe('test-app');
          expect(parsed.versions).toHaveLength(1);
        } finally {
          setJsonMode(false);
        }
      });

      it('should handle empty versions list', async () => {
        mockFetchHelper.addResponse(200, []);
        
        const { appsCommand } = await import('../../src/commands/apps.js');
        await appsCommand.parseAsync(['versions', 'new-app'], { from: 'user' });
        
        const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
        expect(calls).toContain('No versions');
      });

      it('should call correct API endpoint', async () => {
        mockFetchHelper.addResponse(200, []);
        
        const { appsCommand } = await import('../../src/commands/apps.js');
        await appsCommand.parseAsync(['versions', 'specific-app'], { from: 'user' });
        
        expect(mockFetchHelper.calls[0].url).toContain('/api/cli/apps/specific-app/versions');
      });
    });
  });
});
