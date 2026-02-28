import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, mockEnv, fixtures } from '../mocks/index.js';

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

// Mock console
const mockConsole = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('logout command', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
  });

  describe('when not logged in', () => {
    it('should show info message', async () => {
      const { logoutCommand } = await import('../../src/commands/logout.js');
      await logoutCommand.parseAsync([]);
      
      expect(mockConsole.log).toHaveBeenCalled();
      const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
      expect(calls).toContain('Not logged in');
    });

    it('should output JSON in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      try {
        const { logoutCommand } = await import('../../src/commands/logout.js');
        await logoutCommand.parseAsync([]);
        
        const call = mockConsole.log.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.success).toBe(true);
        expect(parsed.message).toBe('Not logged in');
      } finally {
        setJsonMode(false);
      }
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      mockFS.setFile('/home/testuser/.isolated/credentials.json', JSON.stringify({
        token: 'valid_token',
        email: 'user@example.com',
        userId: 'user_123',
      }));
      mockFS.dirs.add('/home/testuser/.isolated');
    });

    it('should clear credentials', async () => {
      const { logoutCommand } = await import('../../src/commands/logout.js');
      await logoutCommand.parseAsync([]);
      
      // Should have written empty credentials
      expect(mockFS.writeFileSync).toHaveBeenCalledWith(
        '/home/testuser/.isolated/credentials.json',
        '{}',
        expect.anything()
      );
    });

    it('should show success message with email', async () => {
      const { logoutCommand } = await import('../../src/commands/logout.js');
      await logoutCommand.parseAsync([]);
      
      expect(mockConsole.log).toHaveBeenCalled();
      const calls = mockConsole.log.mock.calls.map(c => c.join(' ')).join(' ');
      expect(calls).toContain('user@example.com');
    });

    it('should output JSON in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      try {
        const { logoutCommand } = await import('../../src/commands/logout.js');
        await logoutCommand.parseAsync([]);
        
        const call = mockConsole.log.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.success).toBe(true);
        expect(parsed.message).toBe('Logged out');
        expect(parsed.email).toBe('user@example.com');
      } finally {
        setJsonMode(false);
      }
    });
  });
});
