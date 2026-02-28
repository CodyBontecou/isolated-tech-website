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

// Mock xcode module
const mockDetectXcodeProject = vi.fn();
const mockDeriveSlug = vi.fn();
vi.mock('../../src/lib/xcode.js', () => ({
  detectXcodeProject: mockDetectXcodeProject,
  deriveSlug: mockDeriveSlug,
}));

// Mock ora spinner
const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  stop: vi.fn().mockReturnThis(),
};
vi.mock('ora', () => ({
  default: () => mockSpinner,
}));

// Capture process.exit calls
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit(${code})`);
});

// Mock console
const mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('init command', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockFetchHelper.reset();
    mockDetectXcodeProject.mockReset();
    mockDeriveSlug.mockReset();
    mockSpinner.start.mockClear();
    mockSpinner.succeed.mockClear();
    mockSpinner.fail.mockClear();
    mockSpinner.stop.mockClear();
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

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { initCommand } = await import('../../src/commands/init.js');
      
      await expect(initCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('project detection', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));
    });

    it('should fail when no Xcode project found', async () => {
      mockDetectXcodeProject.mockReturnValue(null);

      const { initCommand } = await import('../../src/commands/init.js');
      
      await expect(initCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should detect and use project info', async () => {
      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.test.myapp',
        marketingVersion: '1.0.0',
        buildNumber: '1',
      });
      mockDeriveSlug.mockReturnValue('my-app');

      // Mock getApp 404 (not found), then registerApp success
      mockFetchHelper.addResponse(404, { error: 'Not found' });
      mockFetchHelper.addResponse(200, {
        id: 'app_123',
        slug: 'my-app',
        name: 'MyApp',
      });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await initCommand.parseAsync([], { from: 'user' });

      // Check registration API was called
      expect(mockFetchHelper.calls).toHaveLength(2);
      expect(mockFetchHelper.calls[1].url).toContain('/api/cli/apps');
    });
  });

  describe('app registration', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));

      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.test.myapp',
        marketingVersion: '1.0.0',
        buildNumber: '1',
      });
      mockDeriveSlug.mockReturnValue('my-app');
    });

    it('should register new app successfully', async () => {
      // Mock getApp 404, then registerApp success
      mockFetchHelper.addResponse(404, { error: 'Not found' });
      mockFetchHelper.addResponse(200, {
        id: 'app_123',
        slug: 'my-app',
        name: 'MyApp',
      });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await initCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Registered');
      expect(allLogs).toContain('MyApp');
    });

    it('should handle already registered app', async () => {
      // Mock getApp success (already exists)
      mockFetchHelper.addResponse(200, {
        id: 'app_123',
        slug: 'my-app',
        name: 'My App',
      });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await initCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('already registered');
    });

    it('should fail when registration fails', async () => {
      // Mock getApp 404, then registerApp error
      mockFetchHelper.addResponse(404, { error: 'Not found' });
      mockFetchHelper.addResponse(500, { error: 'Server error' });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await expect(initCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should send correct data to registration endpoint', async () => {
      mockFetchHelper.addResponse(404, { error: 'Not found' });
      mockFetchHelper.addResponse(200, {
        id: 'app_123',
        slug: 'my-app',
        name: 'MyApp',
      });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await initCommand.parseAsync([], { from: 'user' });

      const registerCall = mockFetchHelper.calls[1];
      const body = JSON.parse(registerCall.options.body as string);
      expect(body.bundleId).toBe('com.test.myapp');
      expect(body.name).toBe('MyApp');
      expect(body.slug).toBe('my-app');
    });
  });

  describe('custom options', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));

      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.test.myapp',
        marketingVersion: '1.0.0',
        buildNumber: '1',
      });
      mockDeriveSlug.mockReturnValue('my-app');
    });

    it('should use custom slug from option', async () => {
      mockFetchHelper.addResponse(404, { error: 'Not found' });
      mockFetchHelper.addResponse(200, {
        id: 'app_123',
        slug: 'custom-slug',
        name: 'MyApp',
      });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await initCommand.parseAsync(['--slug', 'custom-slug'], { from: 'user' });

      const registerCall = mockFetchHelper.calls[1];
      const body = JSON.parse(registerCall.options.body as string);
      expect(body.slug).toBe('custom-slug');
    });

    it('should use custom name from option', async () => {
      mockFetchHelper.addResponse(404, { error: 'Not found' });
      mockFetchHelper.addResponse(200, {
        id: 'app_123',
        slug: 'my-app',
        name: 'Custom Name',
      });

      const { initCommand } = await import('../../src/commands/init.js');
      
      await initCommand.parseAsync(['--name', 'Custom Name'], { from: 'user' });

      const registerCall = mockFetchHelper.calls[1];
      const body = JSON.parse(registerCall.options.body as string);
      expect(body.name).toBe('Custom Name');
    });
  });

  describe('JSON mode', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));

      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.test.myapp',
        marketingVersion: '1.0.0',
        buildNumber: '1',
      });
      mockDeriveSlug.mockReturnValue('my-app');
    });

    it('should output JSON on successful registration', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFetchHelper.addResponse(404, { error: 'Not found' });
        mockFetchHelper.addResponse(200, {
          id: 'app_123',
          slug: 'my-app',
          name: 'MyApp',
        });

        const { initCommand } = await import('../../src/commands/init.js');
        
        await initCommand.parseAsync([], { from: 'user' });

        const jsonCalls = mockConsole.log.mock.calls.filter(call => {
          try {
            JSON.parse(call[0]);
            return true;
          } catch {
            return false;
          }
        });

        expect(jsonCalls.length).toBeGreaterThan(0);
        const output = JSON.parse(jsonCalls[jsonCalls.length - 1][0]);
        expect(output.success).toBe(true);
        expect(output.app.slug).toBe('my-app');
        expect(output.url).toContain('my-app');
      } finally {
        setJsonMode(false);
      }
    });

    it('should output JSON when app already exists', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFetchHelper.addResponse(200, {
          id: 'app_123',
          slug: 'my-app',
          name: 'My App',
        });

        const { initCommand } = await import('../../src/commands/init.js');
        
        await initCommand.parseAsync([], { from: 'user' });

        const jsonCalls = mockConsole.log.mock.calls.filter(call => {
          try {
            JSON.parse(call[0]);
            return true;
          } catch {
            return false;
          }
        });

        const output = JSON.parse(jsonCalls[jsonCalls.length - 1][0]);
        expect(output.success).toBe(true);
        expect(output.message).toContain('already registered');
      } finally {
        setJsonMode(false);
      }
    });
  });
});
