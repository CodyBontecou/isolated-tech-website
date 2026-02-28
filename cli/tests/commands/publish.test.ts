import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, createMockFetch, createMockExec, mockEnv, fixtures } from '../mocks/index.js';

// Mock fs with Buffer support
const mockFS = createMockFS();
const originalReadFileSync = mockFS.readFileSync;
mockFS.readFileSync = vi.fn((path: string, encoding?: string) => {
  // If encoding is specified, return string
  if (encoding) {
    return originalReadFileSync(path, encoding);
  }
  // Otherwise return a Buffer-like object for binary reads
  const content = mockFS.files.get(path);
  if (!content) {
    const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
    (error as any).code = 'ENOENT';
    throw error;
  }
  // Create a real Buffer from the content
  return Buffer.from(content);
});

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

// Mock child_process for Xcode/Sparkle operations
const mockExec = createMockExec();
vi.mock('child_process', () => ({
  execSync: mockExec.execSync,
}));

// Mock path
vi.mock('path', async () => {
  const actual = await vi.importActual('path') as typeof import('path');
  return {
    ...actual,
    basename: (p: string) => p.split('/').pop() || p,
  };
});

// Mock sparkle module (path from src/commands/ to src/lib/)
const mockCanSign = vi.fn();
const mockSignForSparkle = vi.fn();
vi.mock('../../src/lib/sparkle.js', () => ({
  canSign: mockCanSign,
  signForSparkle: mockSignForSparkle,
}));

// Mock fetch
const mockFetchHelper = createMockFetch();
const originalFetch = global.fetch;

// Capture process.exit calls - allow string "1" or number 1
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit(${code})`);
});

// Mock console
const mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

// Mock ora spinner
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  }),
}));

describe('publish command', () => {
  let restoreEnv: () => void;
  
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockFetchHelper.reset();
    mockExec.reset();
    mockCanSign.mockReset();
    mockSignForSparkle.mockReset();
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
    it('should exit with error when not authenticated', async () => {
      const { publishCommand } = await import('../../src/commands/publish.js');
      
      await expect(publishCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);
    });
  });

  describe('when authenticated', () => {
    beforeEach(() => {
      // Set up credentials
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
      }));
    });

    describe('project detection', () => {
      it('should fail when no Xcode project found and no manual flags', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });

      it('should fail when missing required info without project', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        // Only version provided, missing build and slug
        await expect(publishCommand.parseAsync(['--version', '1.0.0'], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });
    });

    describe('zip file handling', () => {
      it('should fail when no zip file found', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });

      it('should use provided zip path', async () => {
        // Set up all required mocks
        mockFS.setFile('/path/to/app.zip', 'mock zip content');
        mockFS.statSync = vi.fn().mockReturnValue({ size: 1024 * 1024 });
        
        // Mock Sparkle signing
        mockCanSign.mockReturnValue(true);
        mockSignForSparkle.mockResolvedValue({ signature: 'test_signature', fileSize: 1024 * 1024 });
        
        // Mock API responses
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' }); // getApp
        mockFetchHelper.addResponse(200, { uploadUrl: 'https://upload.url', r2Key: 'apps/my-app/1.0.0.zip', appId: 'app_123' }); // presign
        mockFetchHelper.addResponse(200, { r2Key: 'apps/my-app/1.0.0.zip', size: 1024 }); // upload
        mockFetchHelper.addResponse(200, { id: 'v_123', version: '1.0.0', build_number: 1 }); // confirm
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app',
          '--no-bump'
        ], { from: 'user' });
        
        // Verify the file was read
        expect(mockFS.readFileSync).toHaveBeenCalledWith('/path/to/app.zip');
      });
    });

    describe('Sparkle signing', () => {
      beforeEach(() => {
        mockFS.setFile('/path/to/app.zip', 'mock zip content');
        mockFS.statSync = vi.fn().mockReturnValue({ size: 1024 * 1024 });
      });

      it('should fail when Sparkle signing not available', async () => {
        // Mock canSign to return false
        mockCanSign.mockReturnValue(false);
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });

      it('should fail when signing returns null', async () => {
        mockCanSign.mockReturnValue(true);
        mockSignForSparkle.mockResolvedValue(null);
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });
    });

    describe('API interactions', () => {
      beforeEach(() => {
        // Set up files and signing
        mockFS.setFile('/path/to/app.zip', 'mock zip content');
        mockFS.statSync = vi.fn().mockReturnValue({ size: 1024 * 1024 });
        mockCanSign.mockReturnValue(true);
        mockSignForSparkle.mockResolvedValue({ signature: 'test_signature_abc123', fileSize: 1024 * 1024 });
      });

      it('should fail when app not found', async () => {
        mockFetchHelper.addResponse(404, { error: 'App not found' });
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'nonexistent-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });

      it('should fail when presign fails', async () => {
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' }); // getApp
        mockFetchHelper.addResponse(500, { error: 'Presign failed' }); // presign
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });

      it('should fail when upload fails', async () => {
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' }); // getApp
        mockFetchHelper.addResponse(200, { uploadUrl: 'https://upload.url', r2Key: 'apps/my-app/1.0.0.zip', appId: 'app_123' }); // presign
        mockFetchHelper.addResponse(500, { error: 'Upload failed' }); // upload
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });

      it('should fail when version confirmation fails', async () => {
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' }); // getApp
        mockFetchHelper.addResponse(200, { uploadUrl: 'https://upload.url', r2Key: 'apps/my-app/1.0.0.zip', appId: 'app_123' }); // presign
        mockFetchHelper.addResponse(200, { r2Key: 'apps/my-app/1.0.0.zip', size: 1024 }); // upload
        mockFetchHelper.addResponse(500, { error: 'Version already exists' }); // confirm
        
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await expect(publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app'
        ], { from: 'user' }))
          .rejects.toThrow(/process\.exit/);
      });
    });

    describe('successful publish', () => {
      beforeEach(() => {
        // Set up all required mocks
        mockFS.setFile('/path/to/app.zip', 'mock zip content');
        mockFS.statSync = vi.fn().mockReturnValue({ size: 1024 * 1024 }); // 1MB
        mockCanSign.mockReturnValue(true);
        mockSignForSparkle.mockResolvedValue({ signature: 'test_signature_abc123', fileSize: 1024 * 1024 });
        
        // Mock all API responses
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' }); // getApp
        mockFetchHelper.addResponse(200, { uploadUrl: 'https://upload.url', r2Key: 'apps/my-app/1.0.0.zip', appId: 'app_123' }); // presign
        mockFetchHelper.addResponse(200, { r2Key: 'apps/my-app/1.0.0.zip', size: 1024 }); // upload
        mockFetchHelper.addResponse(200, { id: 'v_123', version: '1.0.0', build_number: 1 }); // confirm
      });

      it('should publish successfully with manual flags', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app',
          '--notes', 'Initial release',
          '--no-bump'
        ], { from: 'user' });
        
        // Verify API calls were made
        expect(mockFetchHelper.calls).toHaveLength(4);
        expect(mockFetchHelper.calls[0].url).toContain('/api/cli/apps/my-app');
        expect(mockFetchHelper.calls[1].url).toContain('/presign');
        expect(mockFetchHelper.calls[2].url).toContain('/upload');
        expect(mockFetchHelper.calls[3].url).toContain('/confirm');
      });

      it('should send correct data to confirm endpoint', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '2.0.0',
          '--build', '42',
          '--slug', 'my-app',
          '--notes', 'Major update!',
          '--no-bump'
        ], { from: 'user' });
        
        // Check confirm call
        const confirmCall = mockFetchHelper.calls[3];
        const body = JSON.parse(confirmCall.options.body as string);
        
        expect(body.version).toBe('2.0.0');
        expect(body.buildNumber).toBe(42);
        expect(body.releaseNotes).toBe('Major update!');
        expect(body.signature).toBe('test_signature_abc123');
      });

      it('should output JSON in JSON mode', async () => {
        const { setJsonMode } = await import('../../src/lib/output.js');
        setJsonMode(true);
        
        try {
          const { publishCommand } = await import('../../src/commands/publish.js');
          
          await publishCommand.parseAsync([
            '--zip', '/path/to/app.zip',
            '--version', '1.0.0',
            '--build', '1',
            '--slug', 'my-app',
            '--no-bump'
          ], { from: 'user' });
          
          // Find the JSON output
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
          expect(output.app).toBe('my-app');
          expect(output.version).toBe('1.0.0');
          expect(output.build).toBe(1);
        } finally {
          setJsonMode(false);
        }
      });
    });

    describe('dry run', () => {
      beforeEach(() => {
        mockFS.setFile('/path/to/app.zip', 'mock zip content');
        mockFS.statSync = vi.fn().mockReturnValue({ size: 1024 * 1024 });
        mockCanSign.mockReturnValue(true);
        mockSignForSparkle.mockResolvedValue({ signature: 'test_signature_abc123', fileSize: 1024 * 1024 });
        
        // Only getApp is called in dry run
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' });
      });

      it('should not upload when --dry-run is set', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app',
          '--dry-run'
        ], { from: 'user' });
        
        // Only getApp should be called
        expect(mockFetchHelper.calls).toHaveLength(1);
        expect(mockFetchHelper.calls[0].url).toContain('/api/cli/apps/my-app');
      });

      it('should output dry run info in JSON mode', async () => {
        const { setJsonMode } = await import('../../src/lib/output.js');
        setJsonMode(true);
        
        try {
          const { publishCommand } = await import('../../src/commands/publish.js');
          
          await publishCommand.parseAsync([
            '--zip', '/path/to/app.zip',
            '--version', '1.0.0',
            '--build', '1',
            '--slug', 'my-app',
            '--dry-run'
          ], { from: 'user' });
          
          // Find the JSON output
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
          expect(output.dryRun).toBe(true);
        } finally {
          setJsonMode(false);
        }
      });
    });

    describe('release notes', () => {
      beforeEach(() => {
        mockFS.setFile('/path/to/app.zip', 'mock zip content');
        mockFS.statSync = vi.fn().mockReturnValue({ size: 1024 * 1024 });
        mockCanSign.mockReturnValue(true);
        mockSignForSparkle.mockResolvedValue({ signature: 'test_signature_abc123', fileSize: 1024 * 1024 });
        
        mockFetchHelper.addResponse(200, { id: 'app_123', name: 'My App', slug: 'my-app' });
        mockFetchHelper.addResponse(200, { uploadUrl: 'https://upload.url', r2Key: 'apps/my-app/1.0.0.zip', appId: 'app_123' });
        mockFetchHelper.addResponse(200, { r2Key: 'apps/my-app/1.0.0.zip', size: 1024 });
        mockFetchHelper.addResponse(200, { id: 'v_123', version: '1.0.0', build_number: 1 });
      });

      it('should use provided release notes', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app',
          '--notes', 'Custom release notes',
          '--no-bump'
        ], { from: 'user' });
        
        const confirmCall = mockFetchHelper.calls[3];
        const body = JSON.parse(confirmCall.options.body as string);
        expect(body.releaseNotes).toBe('Custom release notes');
      });

      it('should use default notes when none provided', async () => {
        const { publishCommand } = await import('../../src/commands/publish.js');
        
        await publishCommand.parseAsync([
          '--zip', '/path/to/app.zip',
          '--version', '1.0.0',
          '--build', '1',
          '--slug', 'my-app',
          '--no-bump'
        ], { from: 'user' });
        
        const confirmCall = mockFetchHelper.calls[3];
        const body = JSON.parse(confirmCall.options.body as string);
        expect(body.releaseNotes).toBe('Bug fixes and improvements.');
      });
    });
  });
});
