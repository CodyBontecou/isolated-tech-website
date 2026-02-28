import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock child_process
const mockExecSync = vi.fn();
vi.mock('child_process', () => ({
  execSync: mockExecSync,
  spawn: vi.fn(),
}));

// Mock fs
const mockExistsSync = vi.fn().mockReturnValue(true);
const mockMkdirSync = vi.fn();
vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock path
vi.mock('path', async () => {
  const actual = await vi.importActual('path') as typeof import('path');
  return {
    ...actual,
    dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
    join: (...args: string[]) => args.join('/'),
  };
});

describe('simulator library', () => {
  beforeEach(() => {
    vi.resetModules();
    mockExecSync.mockReset();
    mockExistsSync.mockReset();
    mockExistsSync.mockReturnValue(true);
  });

  describe('hasIdb', () => {
    it('should return true when idb is installed', async () => {
      mockExecSync.mockReturnValue('');

      const { hasIdb } = await import('../../src/lib/simulator.js');
      
      expect(hasIdb()).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('which idb', expect.any(Object));
    });

    it('should return false when idb is not installed', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const { hasIdb } = await import('../../src/lib/simulator.js');
      
      expect(hasIdb()).toBe(false);
    });
  });

  describe('listSimulators', () => {
    it('should parse simulator list from xcrun output', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            {
              udid: 'ABC-123',
              name: 'iPhone 15 Pro',
              state: 'Booted',
            },
            {
              udid: 'DEF-456',
              name: 'iPhone 15',
              state: 'Shutdown',
            },
          ],
          'com.apple.CoreSimulator.SimRuntime.tvOS-17-0': [
            {
              udid: 'TV-789',
              name: 'Apple TV',
              state: 'Shutdown',
            },
          ],
        },
      }));

      const { listSimulators } = await import('../../src/lib/simulator.js');
      
      const devices = listSimulators();

      expect(devices).toHaveLength(2);
      expect(devices[0]).toEqual({
        udid: 'ABC-123',
        name: 'iPhone 15 Pro',
        state: 'Booted',
        runtime: 'iOS 17-0', // Note: only first dash is replaced with space
      });
      expect(devices[1]).toEqual({
        udid: 'DEF-456',
        name: 'iPhone 15',
        state: 'Shutdown',
        runtime: 'iOS 17-0',
      });
    });

    it('should return empty array on error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('xcrun failed');
      });

      const { listSimulators } = await import('../../src/lib/simulator.js');
      
      const devices = listSimulators();

      expect(devices).toEqual([]);
    });

    it('should filter to iOS devices only', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'IOS-1', name: 'iPhone', state: 'Shutdown' },
          ],
          'com.apple.CoreSimulator.SimRuntime.watchOS-10-0': [
            { udid: 'WATCH-1', name: 'Apple Watch', state: 'Shutdown' },
          ],
        },
      }));

      const { listSimulators } = await import('../../src/lib/simulator.js');
      
      const devices = listSimulators();

      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('iPhone');
    });
  });

  describe('getBootedSimulator', () => {
    it('should return booted simulator', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'BOOTED-1', name: 'iPhone 15', state: 'Booted' },
            { udid: 'SHUT-1', name: 'iPhone 14', state: 'Shutdown' },
          ],
        },
      }));

      const { getBootedSimulator } = await import('../../src/lib/simulator.js');
      
      const device = getBootedSimulator();

      expect(device).not.toBeNull();
      expect(device!.udid).toBe('BOOTED-1');
      expect(device!.state).toBe('Booted');
    });

    it('should return null when no simulator is booted', async () => {
      mockExecSync.mockReturnValue(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'SHUT-1', name: 'iPhone 15', state: 'Shutdown' },
          ],
        },
      }));

      const { getBootedSimulator } = await import('../../src/lib/simulator.js');
      
      const device = getBootedSimulator();

      expect(device).toBeNull();
    });
  });

  describe('bootSimulator', () => {
    it('should boot simulator by UDID', async () => {
      // First call: list simulators
      mockExecSync.mockReturnValueOnce(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'TARGET-UDID', name: 'iPhone 15', state: 'Shutdown' },
          ],
        },
      }));
      // Subsequent calls: boot commands
      mockExecSync.mockReturnValue('');

      const { bootSimulator } = await import('../../src/lib/simulator.js');
      
      const device = bootSimulator('TARGET-UDID');

      expect(device).not.toBeNull();
      expect(device!.udid).toBe('TARGET-UDID');
      expect(mockExecSync).toHaveBeenCalledWith(
        'xcrun simctl boot TARGET-UDID',
        expect.any(Object)
      );
    });

    it('should boot simulator by name', async () => {
      mockExecSync.mockReturnValueOnce(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'NAME-UDID', name: 'iPhone 15 Pro', state: 'Shutdown' },
          ],
        },
      }));
      mockExecSync.mockReturnValue('');

      const { bootSimulator } = await import('../../src/lib/simulator.js');
      
      const device = bootSimulator('iPhone 15 Pro');

      expect(device).not.toBeNull();
      expect(device!.name).toBe('iPhone 15 Pro');
    });

    it('should find simulator by partial name match', async () => {
      mockExecSync.mockReturnValueOnce(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'MATCH-UDID', name: 'iPhone 15 Pro Max', state: 'Shutdown' },
          ],
        },
      }));
      mockExecSync.mockReturnValue('');

      const { bootSimulator } = await import('../../src/lib/simulator.js');
      
      const device = bootSimulator('Pro Max');

      expect(device).not.toBeNull();
      expect(device!.name).toBe('iPhone 15 Pro Max');
    });

    it('should return null when device not found', async () => {
      mockExecSync.mockReturnValueOnce(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'OTHER', name: 'iPhone 15', state: 'Shutdown' },
          ],
        },
      }));

      const { bootSimulator } = await import('../../src/lib/simulator.js');
      
      const device = bootSimulator('Nonexistent Device');

      expect(device).toBeNull();
    });

    it('should not boot already booted simulator', async () => {
      mockExecSync.mockReturnValueOnce(JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            { udid: 'BOOTED-UDID', name: 'iPhone 15', state: 'Booted' },
          ],
        },
      }));
      // Open simulator app
      mockExecSync.mockReturnValue('');

      const { bootSimulator } = await import('../../src/lib/simulator.js');
      
      const device = bootSimulator('BOOTED-UDID');

      expect(device).not.toBeNull();
      // Should only call simctl list and open -a Simulator, not boot
      expect(mockExecSync).not.toHaveBeenCalledWith(
        expect.stringContaining('xcrun simctl boot'),
        expect.any(Object)
      );
    });
  });

  describe('cleanStatusBar', () => {
    it('should set status bar overrides', async () => {
      mockExecSync.mockReturnValue('');

      const { cleanStatusBar } = await import('../../src/lib/simulator.js');
      
      cleanStatusBar('TEST-UDID');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('xcrun simctl status_bar TEST-UDID override --time "9:41"'),
        expect.any(Object)
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--batteryState charged'),
        expect.any(Object)
      );
    });

    it('should use "booted" as default UDID', async () => {
      mockExecSync.mockReturnValue('');

      const { cleanStatusBar } = await import('../../src/lib/simulator.js');
      
      cleanStatusBar();

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('xcrun simctl status_bar booted'),
        expect.any(Object)
      );
    });
  });

  describe('clearStatusBar', () => {
    it('should clear status bar override', async () => {
      mockExecSync.mockReturnValue('');

      const { clearStatusBar } = await import('../../src/lib/simulator.js');
      
      clearStatusBar('TEST-UDID');

      expect(mockExecSync).toHaveBeenCalledWith(
        'xcrun simctl status_bar TEST-UDID clear',
        expect.any(Object)
      );
    });
  });

  describe('takeSimulatorScreenshot', () => {
    it('should capture screenshot', async () => {
      mockExecSync.mockReturnValue('');

      const { takeSimulatorScreenshot } = await import('../../src/lib/simulator.js');
      
      const result = takeSimulatorScreenshot('/output/screenshot.png', 'TEST-UDID');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'xcrun simctl io TEST-UDID screenshot "/output/screenshot.png"',
        expect.any(Object)
      );
    });

    it('should return false on error', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('screenshot failed');
      });

      const { takeSimulatorScreenshot } = await import('../../src/lib/simulator.js');
      
      const result = takeSimulatorScreenshot('/output/screenshot.png');

      expect(result).toBe(false);
    });
  });

  describe('terminateApp', () => {
    it('should terminate app by bundle ID', async () => {
      mockExecSync.mockReturnValue('');

      const { terminateApp } = await import('../../src/lib/simulator.js');
      
      terminateApp('com.example.app', 'TEST-UDID');

      expect(mockExecSync).toHaveBeenCalledWith(
        'xcrun simctl terminate TEST-UDID com.example.app',
        expect.any(Object)
      );
    });
  });

  describe('launchApp', () => {
    it('should launch app by bundle ID', async () => {
      mockExecSync.mockReturnValue('');

      const { launchApp } = await import('../../src/lib/simulator.js');
      
      const result = launchApp('com.example.app', 'TEST-UDID');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'xcrun simctl launch TEST-UDID com.example.app',
        expect.any(Object)
      );
    });

    it('should return false on launch failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('launch failed');
      });

      const { launchApp } = await import('../../src/lib/simulator.js');
      
      const result = launchApp('com.example.app');

      expect(result).toBe(false);
    });
  });
});
