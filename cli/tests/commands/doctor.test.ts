import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, createMockFetch, mockEnv, fixtures } from '../mocks/index.js';

// Mock fs
const mockFS = createMockFS();
vi.mock('fs', () => ({
  readFileSync: mockFS.readFileSync,
  writeFileSync: mockFS.writeFileSync,
  mkdirSync: mockFS.mkdirSync,
  existsSync: mockFS.existsSync,
  readdirSync: mockFS.readdirSync,
  statSync: mockFS.statSync,
}));

vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

// Mock fetch
const mockFetchHelper = createMockFetch();
const originalFetch = global.fetch;

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
const mockGetSigningInfo = vi.fn();
const mockCanSign = vi.fn();
vi.mock('../../src/lib/sparkle.js', () => ({
  getSigningInfo: mockGetSigningInfo,
  canSign: mockCanSign,
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

// Mock console
const mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('doctor command', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockFetchHelper.reset();
    mockDetectXcodeProject.mockReset();
    mockFindReleaseZip.mockReset();
    mockParseChangelog.mockReset();
    mockDeriveSlug.mockReset();
    mockGetSigningInfo.mockReset();
    mockCanSign.mockReset();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
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

  describe('authentication check', () => {
    it('should detect when user is not authenticated', async () => {
      // No credentials file
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      // "Not logged in" goes to error output
      const allOutput = [...mockConsole.log.mock.calls, ...mockConsole.error.mock.calls].flat().join('\n');
      expect(allOutput).toContain('Not logged in');
    });

    it('should show email when authenticated', async () => {
      // Set up valid credentials
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'doctor@example.com',
      }));

      // Mock whoami response
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'doctor@example.com' });

      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('doctor@example.com');
    });
  });

  describe('project detection', () => {
    it('should detect Xcode project', async () => {
      mockDetectXcodeProject.mockReturnValue({
        path: '/test/MyApp.xcodeproj',
        name: 'MyApp',
        type: 'xcodeproj',
        schemes: ['MyApp'],
        bundleId: 'com.test.myapp',
        marketingVersion: '1.2.3',
        buildNumber: '42',
      });
      mockDeriveSlug.mockReturnValue('my-app');
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('MyApp');
      expect(allLogs).toContain('1.2.3');
      expect(allLogs).toContain('com.test.myapp');
    });

    it('should show error when no project found', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = [...mockConsole.log.mock.calls, ...mockConsole.error.mock.calls].flat().join('\n');
      expect(allLogs).toContain('No Xcode project found');
    });
  });

  describe('signing check', () => {
    it('should show signing available when configured', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({
        available: true,
        method: 'sign_update',
        toolPath: '/usr/local/bin/sign_update',
      });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Sparkle signing');
      expect(allLogs).toContain('sign_update');
    });

    it('should show error when signing not available', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = [...mockConsole.log.mock.calls, ...mockConsole.error.mock.calls].flat().join('\n');
      expect(allLogs).toContain('No Sparkle signing key found');
    });
  });

  describe('release readiness', () => {
    beforeEach(() => {
      // Set up authenticated user
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));
    });

    it('should detect release zip file', async () => {
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
      mockFindReleaseZip.mockReturnValue('/test/releases/MyApp-1.0.0.zip');
      mockParseChangelog.mockReturnValue('## 1.0.0\n- Initial release');
      mockGetSigningInfo.mockReturnValue({
        available: true,
        method: 'sign_update',
        toolPath: '/usr/local/bin/sign_update',
      });
      mockFS.setFile('/test/releases/MyApp-1.0.0.zip', 'mock zip content');

      // Mock whoami and getApp
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });
      mockFetchHelper.addResponse(200, { id: 'app_123', slug: 'my-app', name: 'My App' });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('MyApp-1.0.0.zip');
    });

    it('should show missing items when not ready', async () => {
      mockDetectXcodeProject.mockReturnValue(null);
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = [...mockConsole.log.mock.calls, ...mockConsole.error.mock.calls].flat().join('\n');
      expect(allLogs).toContain('Not ready to publish');
    });

    it('should show ready when all checks pass', async () => {
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
      mockFindReleaseZip.mockReturnValue('/test/MyApp.zip');
      mockParseChangelog.mockReturnValue('## 1.0.0\n- Initial release');
      mockGetSigningInfo.mockReturnValue({
        available: true,
        method: 'sign_update',
        toolPath: '/usr/local/bin/sign_update',
      });
      mockFS.setFile('/test/MyApp.zip', 'mock zip content');

      // Mock all API responses
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });
      mockFetchHelper.addResponse(200, { id: 'app_123', slug: 'my-app', name: 'My App' });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('All checks passed');
    });
  });

  describe('JSON mode', () => {
    it('should output JSON when in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
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
        mockParseChangelog.mockReturnValue(null);
        mockGetSigningInfo.mockReturnValue({ available: false });

        const { doctorCommand } = await import('../../src/commands/doctor.js');
        
        await doctorCommand.parseAsync([], { from: 'user' });

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
        expect(output).toHaveProperty('ready');
        expect(output).toHaveProperty('authenticated');
        expect(output).toHaveProperty('project');
        expect(output).toHaveProperty('signing');
      } finally {
        setJsonMode(false);
      }
    });

    it('should include project details in JSON output', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockDetectXcodeProject.mockReturnValue({
          path: '/test/MyApp.xcodeproj',
          name: 'MyApp',
          type: 'xcodeproj',
          schemes: ['MyApp'],
          bundleId: 'com.test.myapp',
          marketingVersion: '2.0.0',
          buildNumber: '99',
        });
        mockDeriveSlug.mockReturnValue('my-app');
        mockFindReleaseZip.mockReturnValue(null);
        mockParseChangelog.mockReturnValue(null);
        mockGetSigningInfo.mockReturnValue({ available: false });

        const { doctorCommand } = await import('../../src/commands/doctor.js');
        
        await doctorCommand.parseAsync([], { from: 'user' });

        const jsonCalls = mockConsole.log.mock.calls.filter(call => {
          try {
            JSON.parse(call[0]);
            return true;
          } catch {
            return false;
          }
        });

        const output = JSON.parse(jsonCalls[jsonCalls.length - 1][0]);
        expect(output.project.detected).toBe(true);
        expect(output.project.name).toBe('MyApp');
        expect(output.project.version).toBe('2.0.0');
        expect(output.project.build).toBe('99');
      } finally {
        setJsonMode(false);
      }
    });
  });

  describe('app registration check', () => {
    it('should check if app is registered when authenticated', async () => {
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
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      // Mock whoami and getApp
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });
      mockFetchHelper.addResponse(200, { id: 'app_123', slug: 'my-app', name: 'My App' });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('App registered');
      expect(allLogs).toContain('My App');
    });

    it('should suggest registration when app not found', async () => {
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
      mockFindReleaseZip.mockReturnValue(null);
      mockParseChangelog.mockReturnValue(null);
      mockGetSigningInfo.mockReturnValue({ available: false });

      // Mock whoami success, getApp 404
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });
      mockFetchHelper.addResponse(404, { error: 'Not found' });

      const { doctorCommand } = await import('../../src/commands/doctor.js');
      
      await doctorCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('App not registered');
      expect(allLogs).toContain('isolated init');
    });
  });
});
