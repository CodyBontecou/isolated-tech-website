import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Output utilities', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };
  
  beforeEach(() => {
    vi.resetModules();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });
  
  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('setJsonMode / isJsonMode', () => {
    it('should default to false', async () => {
      const { isJsonMode } = await import('../../src/lib/output.js');
      expect(isJsonMode()).toBe(false);
    });

    it('should set JSON mode', async () => {
      const { setJsonMode, isJsonMode } = await import('../../src/lib/output.js');
      
      setJsonMode(true);
      expect(isJsonMode()).toBe(true);
      
      setJsonMode(false);
      expect(isJsonMode()).toBe(false);
    });
  });

  describe('output', () => {
    it('should output JSON when in JSON mode', async () => {
      const { setJsonMode, output } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      output({ foo: 'bar', count: 42 });
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('"foo": "bar"')
      );
    });

    it('should pretty print when not in JSON mode', async () => {
      const { setJsonMode, output } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      output({ name: 'test' });
      
      // Should call console.log (not JSON formatted)
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should output JSON with success flag', async () => {
      const { setJsonMode, success } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      success('Operation completed', { id: '123' });
      
      const call = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toBe('Operation completed');
      expect(parsed.id).toBe('123');
    });

    it('should show checkmark in text mode', async () => {
      const { setJsonMode, success } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      success('Done!');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should output JSON with error info', async () => {
      const { setJsonMode, error } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      error('auth_failed', 'Authentication failed', 'Check credentials');
      
      const call = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('auth_failed');
      expect(parsed.message).toBe('Authentication failed');
      expect(parsed.fix).toBe('Check credentials');
    });

    it('should show X mark in text mode', async () => {
      const { setJsonMode, error } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      error('test_error', 'Something went wrong');
      
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should exclude fix when not provided', async () => {
      const { setJsonMode, error } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      error('simple_error', 'Error message');
      
      const call = consoleSpy.log.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.fix).toBeUndefined();
    });
  });

  describe('warn', () => {
    it('should output to stderr in JSON mode', async () => {
      const { setJsonMode, warn } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      warn('This is a warning');
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.warning).toBe('This is a warning');
    });

    it('should show warning symbol in text mode', async () => {
      const { setJsonMode, warn } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      warn('Watch out!');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should output nothing in JSON mode', async () => {
      const { setJsonMode, info } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      info('Some info');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should show info in text mode', async () => {
      const { setJsonMode, info } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      info('Helpful info');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('banner', () => {
    it('should output nothing in JSON mode', async () => {
      const { setJsonMode, banner } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      banner('My Command');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should show banner in text mode', async () => {
      const { setJsonMode, banner } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      banner('My Command');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('kv', () => {
    it('should output nothing in JSON mode', async () => {
      const { setJsonMode, kv } = await import('../../src/lib/output.js');
      setJsonMode(true);
      
      kv('key', 'value');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should show key-value in text mode', async () => {
      const { setJsonMode, kv } = await import('../../src/lib/output.js');
      setJsonMode(false);
      
      kv('status', 'active');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});
