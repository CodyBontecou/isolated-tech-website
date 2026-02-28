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

// Mock 'open' package for browser opening
const mockOpen = vi.fn();
vi.mock('open', () => ({
  default: mockOpen,
}));

// Mock ora spinner - needs to be a shared instance
const mockSpinner = {
  start: vi.fn(function() { return mockSpinner; }),
  succeed: vi.fn(function() { return mockSpinner; }),
  fail: vi.fn(function() { return mockSpinner; }),
  stop: vi.fn(function() { return mockSpinner; }),
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

describe('login command', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockFetchHelper.reset();
    mockOpen.mockReset();
    mockOpen.mockResolvedValue(undefined);
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

  describe('already authenticated', () => {
    it('should exit early when already logged in with valid token', async () => {
      // Set up valid credentials
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));

      // Mock whoami to return success
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Should only have called whoami, not initiate
      expect(mockFetchHelper.calls).toHaveLength(1);
      expect(mockFetchHelper.calls[0].url).toContain('/api/cli/whoami');
    });

    it('should proceed with login when token is invalid', async () => {
      // Set up expired/invalid credentials
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'invalid_token',
      }));

      // whoami fails, then initiate auth succeeds, then poll returns complete immediately
      mockFetchHelper.addResponse(401, { error: 'Unauthorized' });
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Should have cleared old credentials and got new ones
      expect(mockFetchHelper.calls).toHaveLength(3);
      expect(mockFetchHelper.calls[1].url).toContain('/api/cli/auth/initiate');
    });

    it('should re-authenticate when --force flag is used', async () => {
      // Set up valid credentials
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'test@example.com',
      }));

      // Mock initiate and poll - complete immediately
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_456', email: 'new@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync(['--force'], { from: 'user' });

      // Should skip whoami and go straight to initiate
      expect(mockFetchHelper.calls[0].url).toContain('/api/cli/auth/initiate');
    });

    it('should output JSON when already authenticated in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
          token: 'valid_token',
        }));
        mockFetchHelper.addResponse(200, { id: 'user_123', email: 'test@example.com' });

        const { loginCommand } = await import('../../src/commands/login.js');
        
        await loginCommand.parseAsync([], { from: 'user' });

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
        expect(output.email).toBe('test@example.com');
      } finally {
        setJsonMode(false);
      }
    });
  });

  describe('auth initiation', () => {
    it('should fail when initiate auth fails', async () => {
      mockFetchHelper.addResponse(500, { error: 'Server error' });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await expect(loginCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      // Check that exit was called with code 1
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should display verification code and URL', async () => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'TEST-CODE',
        verificationUrl: 'https://test.api.com/cli/auth?code=TEST-CODE',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Check that the user code was logged
      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('TEST-CODE');
    });

    it('should open browser with verification URL', async () => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      expect(mockOpen).toHaveBeenCalledWith('https://test.api.com/cli/auth?code=ABC-DEF');
    });

    it('should continue even if browser fails to open', async () => {
      mockOpen.mockRejectedValue(new Error('No browser available'));
      
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Should still succeed - check credentials were saved
      const writeCall = (mockFS.writeFileSync as any).mock.calls.find(
        (call: any[]) => call[0].includes('credentials.json')
      );
      expect(writeCall).toBeDefined();
      const savedCreds = JSON.parse(writeCall[1]);
      expect(savedCreds.token).toBe('new_token');
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
    });

    it('should poll until complete', async () => {
      // First poll: pending (but we make it complete immediately for speed)
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // initiate + 1 poll
      expect(mockFetchHelper.calls).toHaveLength(2);
    });

    it('should save credentials on success', async () => {
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'saved_token_xyz',
        user: { id: 'user_123', email: 'saved@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Check credentials were saved
      expect(mockFS.writeFileSync).toHaveBeenCalled();
      const writeCall = (mockFS.writeFileSync as any).mock.calls.find(
        (call: any[]) => call[0].includes('credentials.json')
      );
      expect(writeCall).toBeDefined();
      const savedCreds = JSON.parse(writeCall[1]);
      expect(savedCreds.token).toBe('saved_token_xyz');
      expect(savedCreds.email).toBe('saved@example.com');
    });

    it('should fail when auth expires', async () => {
      mockFetchHelper.addResponse(200, { status: 'expired' });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await expect(loginCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should send correct device code in poll request', async () => {
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Check poll request body
      const pollCall = mockFetchHelper.calls[1];
      expect(pollCall.url).toContain('/api/cli/auth/verify');
      const body = JSON.parse(pollCall.options.body as string);
      expect(body.deviceCode).toBe('device_123');
      expect(body.userCode).toBe('ABC-DEF');
    });

    it('should save userId on success', async () => {
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'token_abc',
        user: { id: 'user_999', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      const writeCall = (mockFS.writeFileSync as any).mock.calls.find(
        (call: any[]) => call[0].includes('credentials.json')
      );
      const savedCreds = JSON.parse(writeCall[1]);
      expect(savedCreds.userId).toBe('user_999');
    });
  });

  describe('JSON mode', () => {
    beforeEach(() => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
    });

    it('should output JSON on success', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFetchHelper.addResponse(200, {
          status: 'complete',
          token: 'new_token',
          user: { id: 'user_123', email: 'json@example.com' },
        });

        const { loginCommand } = await import('../../src/commands/login.js');
        
        await loginCommand.parseAsync([], { from: 'user' });

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
        expect(output.email).toBe('json@example.com');
      } finally {
        setJsonMode(false);
      }
    });

    it('should output JSON message on authentication success', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFetchHelper.addResponse(200, {
          status: 'complete',
          token: 'new_token',
          user: { id: 'user_123', email: 'test@example.com' },
        });

        const { loginCommand } = await import('../../src/commands/login.js');
        
        await loginCommand.parseAsync([], { from: 'user' });

        const jsonCalls = mockConsole.log.mock.calls.filter(call => {
          try {
            const parsed = JSON.parse(call[0]);
            return parsed.message === 'Authentication successful';
          } catch {
            return false;
          }
        });

        expect(jsonCalls.length).toBe(1);
      } finally {
        setJsonMode(false);
      }
    });
  });

  describe('error handling', () => {
    it('should handle empty initiate response by showing undefined values', async () => {
      // Empty response - fields will be undefined, but code still proceeds
      mockFetchHelper.addResponse(200, {});
      // Poll returns expired to end the loop quickly
      mockFetchHelper.addResponse(200, { status: 'expired' });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await expect(loginCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      // The code proceeds with undefined values and eventually expires
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should show error and exit on network failure during initiate', async () => {
      mockFetchHelper.addResponse(500, { error: 'Server unavailable' });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await expect(loginCommand.parseAsync([], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle missing user data on complete', async () => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        // user is undefined
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      // Should still save credentials even without user info
      const writeCall = (mockFS.writeFileSync as any).mock.calls.find(
        (call: any[]) => call[0].includes('credentials.json')
      );
      expect(writeCall).toBeDefined();
      const savedCreds = JSON.parse(writeCall[1]);
      expect(savedCreds.token).toBe('new_token');
    });
  });

  describe('output messages', () => {
    it('should display success message with email', async () => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://test.api.com/cli/auth?code=ABC-DEF',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'success@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('success@example.com');
    });

    it('should display verification URL', async () => {
      mockFetchHelper.addResponse(200, {
        deviceCode: 'device_123',
        userCode: 'ABC-DEF',
        verificationUrl: 'https://custom.url.com/verify',
        expiresIn: 300,
      });
      mockFetchHelper.addResponse(200, {
        status: 'complete',
        token: 'new_token',
        user: { id: 'user_123', email: 'test@example.com' },
      });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('https://custom.url.com/verify');
    });

    it('should display already logged in message', async () => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
      }));
      mockFetchHelper.addResponse(200, { id: 'user_123', email: 'existing@example.com' });

      const { loginCommand } = await import('../../src/commands/login.js');
      
      await loginCommand.parseAsync([], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('existing@example.com');
      expect(allLogs).toContain('Already logged in');
    });
  });
});
