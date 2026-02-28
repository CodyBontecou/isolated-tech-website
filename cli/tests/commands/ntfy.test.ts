import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockFS, mockEnv } from '../mocks/index.js';

// Mock fs
const mockFS = createMockFS();
vi.mock('fs', () => ({
  readFileSync: mockFS.readFileSync,
  writeFileSync: mockFS.writeFileSync,
  mkdirSync: mockFS.mkdirSync,
  existsSync: mockFS.existsSync,
  readdirSync: mockFS.readdirSync,
}));

vi.mock('os', () => ({
  homedir: () => '/home/testuser',
}));

// Mock ntfy lib module
const mockSendNotification = vi.fn();
const mockGenerateCloudflareCode = vi.fn();
const mockGenerateSwiftCode = vi.fn();
vi.mock('../../src/lib/ntfy.js', () => ({
  sendNotification: mockSendNotification,
  generateCloudflareCode: mockGenerateCloudflareCode,
  generateSwiftCode: mockGenerateSwiftCode,
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

describe('ntfy command', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockSendNotification.mockReset();
    mockGenerateCloudflareCode.mockReset();
    mockGenerateSwiftCode.mockReset();
    mockSpinner.start.mockClear();
    mockSpinner.succeed.mockClear();
    mockSpinner.fail.mockClear();
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
    mockExit.mockClear();
    restoreEnv = mockEnv({
      ISOLATED_API_URL: 'https://test.api.com',
    });
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('setup command', () => {
    it('should save topic to config', async () => {
      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['setup', 'my-alerts'], { from: 'user' });

      expect(mockFS.writeFileSync).toHaveBeenCalled();
      const writeCall = (mockFS.writeFileSync as any).mock.calls.find(
        (call: any[]) => call[0].includes('config.json')
      );
      expect(writeCall).toBeDefined();
      const savedConfig = JSON.parse(writeCall[1]);
      expect(savedConfig.ntfyTopic).toBe('my-alerts');
    });

    it('should show success message', async () => {
      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['setup', 'test-topic'], { from: 'user' });

      const allLogs = mockConsole.log.mock.calls.flat().join('\n');
      expect(allLogs).toContain('test-topic');
      expect(allLogs).toContain('Configured');
    });

    it('should output JSON in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        const { ntfyCommand } = await import('../../src/commands/ntfy.js');
        
        await ntfyCommand.parseAsync(['setup', 'json-topic'], { from: 'user' });

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
        expect(output.topic).toBe('json-topic');
      } finally {
        setJsonMode(false);
      }
    });
  });

  describe('test command', () => {
    it('should fail when no topic configured', async () => {
      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await expect(ntfyCommand.parseAsync(['test'], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should send test notification when topic configured', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'my-topic',
      }));

      mockSendNotification.mockResolvedValue({ success: true, id: 'msg_123' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['test'], { from: 'user' });

      expect(mockSendNotification).toHaveBeenCalledWith(
        'my-topic',
        expect.stringContaining('test notification'),
        expect.objectContaining({
          title: 'Test Alert',
          priority: 'default',
        })
      );
    });

    it('should use override topic when provided', async () => {
      mockSendNotification.mockResolvedValue({ success: true, id: 'msg_123' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['test', '--topic', 'override-topic'], { from: 'user' });

      expect(mockSendNotification).toHaveBeenCalledWith(
        'override-topic',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should fail when send fails', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'my-topic',
      }));

      mockSendNotification.mockResolvedValue({ success: false, error: 'Network error' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await expect(ntfyCommand.parseAsync(['test'], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('send command', () => {
    it('should fail when no topic configured', async () => {
      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await expect(ntfyCommand.parseAsync(['send', 'Hello world'], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);
    });

    it('should send custom message', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'my-topic',
      }));

      mockSendNotification.mockResolvedValue({ success: true, id: 'msg_456' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['send', 'Custom message here'], { from: 'user' });

      expect(mockSendNotification).toHaveBeenCalledWith(
        'my-topic',
        'Custom message here',
        expect.any(Object)
      );
    });

    it('should support custom title', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'my-topic',
      }));

      mockSendNotification.mockResolvedValue({ success: true, id: 'msg_789' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['send', 'Message', '--title', 'Custom Title'], { from: 'user' });

      expect(mockSendNotification).toHaveBeenCalledWith(
        'my-topic',
        'Message',
        expect.objectContaining({
          title: 'Custom Title',
        })
      );
    });

    it('should support priority levels', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'my-topic',
      }));

      mockSendNotification.mockResolvedValue({ success: true, id: 'msg_urgent' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['send', 'Urgent!', '--priority', 'urgent'], { from: 'user' });

      expect(mockSendNotification).toHaveBeenCalledWith(
        'my-topic',
        'Urgent!',
        expect.objectContaining({
          priority: 'urgent',
        })
      );
    });

    it('should support tags', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'my-topic',
      }));

      mockSendNotification.mockResolvedValue({ success: true, id: 'msg_tags' });

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['send', 'Tagged', '--tags', 'warning,fire'], { from: 'user' });

      expect(mockSendNotification).toHaveBeenCalledWith(
        'my-topic',
        'Tagged',
        expect.objectContaining({
          tags: ['warning', 'fire'],
        })
      );
    });
  });

  describe('topic command', () => {
    it('should show configured topic', async () => {
      mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
        ntfyTopic: 'configured-topic',
      }));

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['topic'], { from: 'user' });

      expect(mockConsole.log).toHaveBeenCalledWith('configured-topic');
    });

    it('should fail when no topic configured', async () => {
      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await expect(ntfyCommand.parseAsync(['topic'], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);
    });

    it('should output JSON in JSON mode', async () => {
      const { setJsonMode } = await import('../../src/lib/output.js');
      setJsonMode(true);

      try {
        mockFS.setFile('/home/testuser/.isolated/config.json', JSON.stringify({
          ntfyTopic: 'json-topic',
        }));

        const { ntfyCommand } = await import('../../src/commands/ntfy.js');
        
        await ntfyCommand.parseAsync(['topic'], { from: 'user' });

        const jsonCalls = mockConsole.log.mock.calls.filter(call => {
          try {
            JSON.parse(call[0]);
            return true;
          } catch {
            return false;
          }
        });

        const output = JSON.parse(jsonCalls[jsonCalls.length - 1][0]);
        expect(output.topic).toBe('json-topic');
      } finally {
        setJsonMode(false);
      }
    });
  });

  describe('init command', () => {
    it('should detect cloudflare project', async () => {
      mockFS.setFile('wrangler.toml', '[vars]');
      mockGenerateCloudflareCode.mockReturnValue('// Cloudflare alerts code');

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['init'], { from: 'user' });

      expect(mockGenerateCloudflareCode).toHaveBeenCalled();
      expect(mockFS.writeFileSync).toHaveBeenCalled();
    });

    it('should detect swift project', async () => {
      mockFS.setFile('Package.swift', '// swift-tools-version:5.7');
      mockGenerateSwiftCode.mockReturnValue('// Swift Ntfy code');

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['init'], { from: 'user' });

      expect(mockGenerateSwiftCode).toHaveBeenCalled();
    });

    it('should use explicit type', async () => {
      mockGenerateCloudflareCode.mockReturnValue('// CF code');

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['init', '--type', 'cloudflare'], { from: 'user' });

      expect(mockGenerateCloudflareCode).toHaveBeenCalled();
    });

    it('should fail when project type cannot be detected', async () => {
      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await expect(ntfyCommand.parseAsync(['init'], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);
    });

    it('should write to custom output path', async () => {
      mockGenerateCloudflareCode.mockReturnValue('// CF code');

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await ntfyCommand.parseAsync(['init', '--type', 'cloudflare', '--output', 'custom/path.ts'], { from: 'user' });

      const writeCall = (mockFS.writeFileSync as any).mock.calls.find(
        (call: any[]) => call[0] === 'custom/path.ts'
      );
      expect(writeCall).toBeDefined();
    });

    it('should fail if file already exists', async () => {
      mockFS.setFile('wrangler.toml', '[vars]');
      mockFS.setFile('src/lib/alerts.ts', '// existing');
      mockGenerateCloudflareCode.mockReturnValue('// CF code');

      const { ntfyCommand } = await import('../../src/commands/ntfy.js');
      
      await expect(ntfyCommand.parseAsync(['init'], { from: 'user' }))
        .rejects.toThrow(/process\.exit/);
    });
  });
});
