import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original fetch
const originalFetch = global.fetch;

describe('ntfy library', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('sendNotification', () => {
    it('should send notification with basic message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      const result = await sendNotification('my-topic', 'Hello world');

      expect(result.success).toBe(true);
      expect(result.id).toBe('msg_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://ntfy.sh/my-topic',
        expect.objectContaining({
          method: 'POST',
          body: 'Hello world',
        })
      );
    });

    it('should send notification with title', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_456' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      await sendNotification('my-topic', 'Message', { title: 'Alert Title' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Title', 'Alert Title');
    });

    it('should send notification with priority', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_789' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      await sendNotification('my-topic', 'Urgent!', { priority: 'urgent' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Priority', 'urgent');
    });

    it('should send notification with tags', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_tags' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      await sendNotification('my-topic', 'Tagged', { tags: ['warning', 'fire'] });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Tags', 'warning,fire');
    });

    it('should send notification with click URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_click' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      await sendNotification('my-topic', 'Click me', { click: 'https://example.com' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Click', 'https://example.com');
    });

    it('should handle non-ASCII titles', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_emoji' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      await sendNotification('my-topic', 'Message', { title: '🚨 Error' });

      const callArgs = mockFetch.mock.calls[0];
      // Non-ASCII should be stripped from header
      expect(callArgs[1].headers.Title).toBe('Error');
    });

    it('should return error on HTTP failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      const result = await sendNotification('my-topic', 'Message');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });

    it('should return error on network failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      const result = await sendNotification('my-topic', 'Message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should use default priority when not specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_default' }),
      });
      global.fetch = mockFetch;

      const { sendNotification } = await import('../../src/lib/ntfy.js');
      
      await sendNotification('my-topic', 'Message');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Priority', 'default');
    });
  });

  describe('sendErrorAlert', () => {
    it('should send error alert with high priority', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_error' }),
      });
      global.fetch = mockFetch;

      const { sendErrorAlert } = await import('../../src/lib/ntfy.js');
      
      await sendErrorAlert('my-topic', 'Something went wrong');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Priority', 'high');
      expect(callArgs[1].headers).toHaveProperty('Title', 'Error Alert');
      expect(callArgs[1].body).toBe('Something went wrong');
    });

    it('should include context in message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_context' }),
      });
      global.fetch = mockFetch;

      const { sendErrorAlert } = await import('../../src/lib/ntfy.js');
      
      await sendErrorAlert('my-topic', 'Error message', 'During sync');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toContain('During sync');
      expect(callArgs[1].body).toContain('Error message');
    });
  });

  describe('sendSuccessAlert', () => {
    it('should send success alert with default priority', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_success' }),
      });
      global.fetch = mockFetch;

      const { sendSuccessAlert } = await import('../../src/lib/ntfy.js');
      
      await sendSuccessAlert('my-topic', 'Task completed!');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers).toHaveProperty('Priority', 'default');
      expect(callArgs[1].headers).toHaveProperty('Title', 'Success');
      expect(callArgs[1].headers).toHaveProperty('Tags', 'white_check_mark');
    });
  });

  describe('generateCloudflareCode', () => {
    it('should generate valid TypeScript code', async () => {
      const { generateCloudflareCode } = await import('../../src/lib/ntfy.js');
      
      const code = generateCloudflareCode();

      expect(code).toContain('export async function sendAlert');
      expect(code).toContain('export async function alertError');
      expect(code).toContain('https://ntfy.sh');
      expect(code).toContain('NTFY_TOPIC');
    });

    it('should include type definitions', async () => {
      const { generateCloudflareCode } = await import('../../src/lib/ntfy.js');
      
      const code = generateCloudflareCode();

      expect(code).toContain('interface AlertOptions');
      expect(code).toContain("priority?: 'min' | 'low' | 'default' | 'high' | 'urgent'");
    });
  });

  describe('generateSwiftCode', () => {
    it('should generate valid Swift code', async () => {
      const { generateSwiftCode } = await import('../../src/lib/ntfy.js');
      
      const code = generateSwiftCode();

      expect(code).toContain('enum Ntfy');
      expect(code).toContain('static func send');
      expect(code).toContain('static func error');
      expect(code).toContain('https://ntfy.sh');
    });

    it('should include priority enum', async () => {
      const { generateSwiftCode } = await import('../../src/lib/ntfy.js');
      
      const code = generateSwiftCode();

      expect(code).toContain('enum Priority: String');
      // All cases are on one line
      expect(code).toContain('case min, low,');
      expect(code).toContain('high, urgent');
    });

    it('should read from environment variable', async () => {
      const { generateSwiftCode } = await import('../../src/lib/ntfy.js');
      
      const code = generateSwiftCode();

      expect(code).toContain('ProcessInfo.processInfo.environment["NTFY_TOPIC"]');
    });
  });
});
