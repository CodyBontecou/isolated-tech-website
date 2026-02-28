import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, createMockFetch, mockEnv, fixtures } from '../mocks/index.js';

// Mock fs
const mockFS = createMockFS();
vi.mock('fs', () => ({
  readFileSync: mockFS.readFileSync,
  writeFileSync: mockFS.writeFileSync,
  mkdirSync: mockFS.mkdirSync,
  existsSync: mockFS.existsSync,
  statSync: mockFS.statSync,
}));

vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

// Mock xcode module
const mockDetectXcodeProject = vi.fn();
const mockFindReleaseZip = vi.fn();
const mockParseChangelog = vi.fn();
const mockDeriveSlug = vi.fn();
vi.mock('../../src/lib/xcode.js', () => ({
  detectXcodeProject: mockDetectXcodeProject,
  findReleaseZip: mockFindReleaseZip,
  parseChangelog: mockParseChangelog,
  deriveSlug: mockDeriveSlug,
}));

// Mock sparkle module
const mockCanSign = vi.fn();
vi.mock('../../src/lib/sparkle.js', () => ({
  canSign: mockCanSign,
}));

// Mock console
const mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('status command', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockDetectXcodeProject.mockReset();
    mockFindReleaseZip.mockReset();
    mockParseChangelog.mockReset();
    mockDeriveSlug.mockReset();
    mockCanSign.mockReset();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
    restoreEnv = mockEnv({
      ISOLATED_API_URL: 'https://test.api.com',
      ISOLATED_API_KEY: undefined,
    });
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('authentication status', () => {
    it('should show not logged in when no credentials', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Not logged in');
    });

    it('should show email when authenticated', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'status@example.com',
      }));

      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('status@example.com');
    });
  });

  describe('project status', () => {
    it('should show project details when detected', async () => {
      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.test.myapp',
        marketingVersion: '2.5.0',
        buildNumber: '100',
      });
      mockDeriveSlug.mockReturnValue('my-app');
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('MyApp');
      expect(allLogs).toContain('2.5.0');
      expect(allLogs).toContain('100');
      expect(allLogs).toContain('my-app');
    });

    it('should show no project when none found', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('No Xcode project found');
    });

    it('should show bundle ID when available', async () => {
      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.example.special.app',
        marketingVersion: '1.0.0',
        buildNumber: '1',
      });
      mockDeriveSlug.mockReturnValue('my-app');
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('com.example.special.app');
    });
  });

  describe('signing status', () => {
    it('should show signing available when configured', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(true);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Sparkle signing available');
    });

    it('should show no signing when not available', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('No signing capability');
    });
  });

  describe('release status', () => {
    it('should show zip file info when found', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue('/test/MyApp.zip');
      mockParseChangelog.mockReturnValue('## 1.0.0\n- Initial');
      mockCanSign.mockReturnValue(false);
      
      // Mock file size (10MB)
      mockFS.setFile('/test/MyApp.zip', 'x'.repeat(10 * 1024 * 1024));

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('MyApp.zip');
      expect(allLogs).toContain('10MB');
    });

    it('should show no zip when none found', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockCanSign.mockReturnValue(false);

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('No .zip file found');
    });

    it('should show changelog status', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue('/test/MyApp.zip');
      mockParseChangelog.mockReturnValue('## 1.0.0\n- Initial release');
      mockCanSign.mockReturnValue(false);
      mockFS.setFile('/test/MyApp.zip', 'content');

      const { statusCommand } = await import('../../src/commands/status.js');
      
      await statusCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('CHANGELOG.md found');
    });
  });

  describe('JSON mode', () => {
    it('should output JSON when in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
          token: 'valid_token',
          email: 'json@example.com',
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
        mockFindReleaseZip.mockReturnValue(null);
        mockCanSign.mockReturnValue(true);

        const { statusCommand } = await import('../../src/commands/status.js');
        
        await statusCommand.parseAsync([], { from: 'user' });

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
        expect(output.authenticated).toBe(true);
        expect(output.email).toBe('json@example.com');
        expect(output.project.name).toBe('MyApp');
        expect(output.canSign).toBe(true);
      } finally {
        setJsonMode(false);
      }
    });

    it('should include release info in JSON output', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockDetectXcodeProject.mockReturnValue(null);
        mockFindReleaseZip.mockReturnValue('/test/MyApp.zip');
        mockParseChangelog.mockReturnValue('## 1.0.0\n- Initial');
        mockCanSign.mockReturnValue(false);
        mockFS.setFile('/test/MyApp.zip', 'x'.repeat(5 * 1024 * 1024));

        const { statusCommand } = await import('../../src/commands/status.js');
        
        await statusCommand.parseAsync([], { from: 'user' });

        const jsonCalls = mockConsole.log.mock.calls.filter(call => {
          try {
            JSON.parse(call[0]);
            return true;
          } catch {
            return false;
          }
        });

        const output = JSON.parse(jsonCalls[jsonCalls.length - 1][0]);
        expect(output.release).toBeDefined();
        expect(output.release.zipFile).toContain('MyApp.zip');
        expect(output.release.hasChangelog).toBe(true);
      } finally {
        setJsonMode(false);
      }
    });
  });
});
