import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, createMockExec, mockEnv } from '../mocks/index.js';

// Mock fs
const mockFS = createMockFS();
vi.mock('fs', () => ({
  existsSync: mockFS.existsSync,
  readFileSync: mockFS.readFileSync,
}));

// Mock child_process
const mockExec = createMockExec();
vi.mock('child_process', () => ({
  execSync: mockExec.execSync,
}));

// Mock os.homedir
vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

describe('Sparkle signing', () => {
  let restoreEnv: () => void;
  
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockExec.reset();
    restoreEnv = mockEnv({
      SPARKLE_ED_PRIVATE_KEY: undefined,
    });
  });
  
  afterEach(() => {
    restoreEnv();
  });

  describe('canSign', () => {
    it('should return true when Sparkle tools are available', async () => {
      mockFS.files.set('/opt/homebrew/bin/sign_update', 'binary');
      
      const { canSign } = await import('../../src/lib/sparkle.js');
      expect(canSign()).toBe(true);
    });

    it('should return true when key is in environment', async () => {
      restoreEnv();
      // Valid Ed25519 private key (32 bytes in base64)
      restoreEnv = mockEnv({
        SPARKLE_ED_PRIVATE_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      });
      
      const { canSign } = await import('../../src/lib/sparkle.js');
      expect(canSign()).toBe(true);
    });

    it('should return true when key is in keychain', async () => {
      mockExec.setOutput('Sparkle EdDSA Key', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
      
      const { canSign } = await import('../../src/lib/sparkle.js');
      expect(canSign()).toBe(true);
    });

    it('should return true when key file exists', async () => {
      mockFS.setFile(
        '/home/testuser/.config/sparkle/ed25519_private.key',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
      );
      
      const { canSign } = await import('../../src/lib/sparkle.js');
      expect(canSign()).toBe(true);
    });

    it('should return false when no signing capability', async () => {
      // No tools, no env, no keychain, no file
      mockExec.setError('security');
      mockExec.setError('find');
      
      const { canSign } = await import('../../src/lib/sparkle.js');
      expect(canSign()).toBe(false);
    });
  });

  describe('signForSparkle', () => {
    it('should use Sparkle sign_update tool when available', async () => {
      mockFS.files.set('/opt/homebrew/bin/sign_update', 'binary');
      mockFS.setFile('/test/app.zip', 'app content here');
      
      mockExec.setOutput('sign_update', `sparkle:edSignature="ABC123==" length="1234"`);
      
      const { signForSparkle } = await import('../../src/lib/sparkle.js');
      const result = await signForSparkle('/test/app.zip');
      
      expect(result).not.toBeNull();
      expect(result?.signature).toBe('ABC123==');
      expect(result?.fileSize).toBe(1234);
    });

    it('should fall back to native Ed25519 signing', async () => {
      restoreEnv();
      // Use a properly padded 32-byte key (256 bits)
      const validKey = Buffer.alloc(32).fill(0x42).toString('base64');
      restoreEnv = mockEnv({
        SPARKLE_ED_PRIVATE_KEY: validKey,
      });
      
      const content = 'app content for signing';
      mockFS.setFile('/test/app.zip', content);
      // Reset the readFileSync to return the actual content
      mockFS.readFileSync.mockImplementation((path: string) => {
        if (path === '/test/app.zip') {
          return Buffer.from(content);
        }
        throw new Error(`ENOENT: ${path}`);
      });
      
      mockExec.setError('sign_update');  // Tools not available
      mockExec.setError('find');  // No tools in DerivedData
      
      const { signForSparkle } = await import('../../src/lib/sparkle.js');
      const result = await signForSparkle('/test/app.zip');
      
      expect(result).not.toBeNull();
      expect(result?.signature).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64
      expect(result?.fileSize).toBe(content.length);
    });

    it('should return null when no signing capability', async () => {
      mockFS.setFile('/test/app.zip', 'content');
      mockExec.setError('sign_update');
      mockExec.setError('find');
      mockExec.setError('security');
      
      const { signForSparkle } = await import('../../src/lib/sparkle.js');
      const result = await signForSparkle('/test/app.zip');
      
      expect(result).toBeNull();
    });
  });

  describe('getSigningInfo', () => {
    it('should report Sparkle tools method', async () => {
      mockFS.files.set('/opt/homebrew/bin/sign_update', 'binary');
      
      const { getSigningInfo } = await import('../../src/lib/sparkle.js');
      const info = getSigningInfo();
      
      expect(info.available).toBe(true);
      expect(info.method).toBe('sparkle_tools');
      expect(info.toolPath).toBe('/opt/homebrew/bin/sign_update');
    });

    it('should report environment key source', async () => {
      restoreEnv();
      restoreEnv = mockEnv({
        SPARKLE_ED_PRIVATE_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      });
      mockExec.setError('find');
      
      const { getSigningInfo } = await import('../../src/lib/sparkle.js');
      const info = getSigningInfo();
      
      expect(info.available).toBe(true);
      expect(info.method).toBe('native_ed25519');
      expect(info.keySource).toBe('environment');
    });

    it('should report keychain key source', async () => {
      mockExec.setOutput('Sparkle EdDSA Key', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
      mockExec.setError('find');
      
      const { getSigningInfo } = await import('../../src/lib/sparkle.js');
      const info = getSigningInfo();
      
      expect(info.available).toBe(true);
      expect(info.method).toBe('native_ed25519');
      expect(info.keySource).toBe('keychain');
    });

    it('should report file key source', async () => {
      mockFS.setFile(
        '/home/testuser/.config/sparkle/ed25519_private.key',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
      );
      mockExec.setError('find');
      mockExec.setError('security');
      
      const { getSigningInfo } = await import('../../src/lib/sparkle.js');
      const info = getSigningInfo();
      
      expect(info.available).toBe(true);
      expect(info.method).toBe('native_ed25519');
      expect(info.keySource).toBe('file');
    });

    it('should report unavailable when nothing configured', async () => {
      mockExec.setError('find');
      mockExec.setError('security');
      
      const { getSigningInfo } = await import('../../src/lib/sparkle.js');
      const info = getSigningInfo();
      
      expect(info.available).toBe(false);
      expect(info.method).toBeUndefined();
    });
  });

  describe('DerivedData tool discovery', () => {
    it('should find sign_update in DerivedData', async () => {
      const derivedDataPath = '/home/testuser/Library/Developer/Xcode/DerivedData';
      const toolPath = `${derivedDataPath}/Sparkle-abc123/Build/Products/Debug/sign_update`;
      
      // DerivedData directory exists
      mockFS.dirs.add(derivedDataPath);
      
      // find command returns the tool path
      mockExec.setOutput('find', toolPath + '\n');
      
      // The tool exists when checked
      mockFS.files.set(toolPath, 'binary');
      
      // Make sure security (keychain) fails so we don't fall through
      mockExec.setError('security');
      
      const { getSigningInfo } = await import('../../src/lib/sparkle.js');
      const info = getSigningInfo();
      
      expect(info.available).toBe(true);
      expect(info.method).toBe('sparkle_tools');
      expect(info.toolPath).toBe(toolPath);
    });
  });
});
