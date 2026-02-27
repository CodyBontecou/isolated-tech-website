import { execSync, spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

export interface SimulatorDevice {
  udid: string;
  name: string;
  state: 'Booted' | 'Shutdown';
  runtime: string;
}

export interface AccessibilityElement {
  role: string;
  title?: string;
  label?: string;
  value?: string;
  identifier?: string;
  frame: { x: number; y: number; width: number; height: number };
  enabled: boolean;
  children?: AccessibilityElement[];
}

/**
 * Check if idb is installed
 */
export function hasIdb(): boolean {
  try {
    execSync('which idb', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * List available iOS simulators
 */
export function listSimulators(): SimulatorDevice[] {
  try {
    const output = execSync('xcrun simctl list devices --json', { encoding: 'utf-8' });
    const data = JSON.parse(output);
    
    const devices: SimulatorDevice[] = [];
    
    for (const [runtime, runtimeDevices] of Object.entries(data.devices)) {
      if (!runtime.includes('iOS')) continue;
      
      for (const device of runtimeDevices as any[]) {
        devices.push({
          udid: device.udid,
          name: device.name,
          state: device.state,
          runtime: runtime.replace('com.apple.CoreSimulator.SimRuntime.', '').replace('-', ' '),
        });
      }
    }
    
    return devices;
  } catch {
    return [];
  }
}

/**
 * Get booted simulator
 */
export function getBootedSimulator(): SimulatorDevice | null {
  const devices = listSimulators();
  return devices.find(d => d.state === 'Booted') || null;
}

/**
 * Boot a simulator by name or UDID
 */
export function bootSimulator(nameOrUdid: string): SimulatorDevice | null {
  const devices = listSimulators();
  
  // Find matching device
  let device = devices.find(d => d.udid === nameOrUdid || d.name === nameOrUdid);
  
  if (!device) {
    // Try partial match
    device = devices.find(d => d.name.toLowerCase().includes(nameOrUdid.toLowerCase()));
  }
  
  if (!device) return null;
  
  if (device.state === 'Shutdown') {
    execSync(`xcrun simctl boot ${device.udid}`, { stdio: 'pipe' });
    // Wait for boot
    execSync('sleep 2');
    device.state = 'Booted';
  }
  
  // Open Simulator app
  execSync('open -a Simulator', { stdio: 'pipe' });
  
  return device;
}

/**
 * Set clean status bar (9:41, full battery, full WiFi)
 */
export function cleanStatusBar(udid: string = 'booted'): void {
  const commands = [
    `xcrun simctl status_bar ${udid} override --time "9:41"`,
    `xcrun simctl status_bar ${udid} override --batteryState charged`,
    `xcrun simctl status_bar ${udid} override --batteryLevel 100`,
    `xcrun simctl status_bar ${udid} override --wifiMode active`,
    `xcrun simctl status_bar ${udid} override --wifiBars 3`,
    `xcrun simctl status_bar ${udid} override --cellularMode active`,
    `xcrun simctl status_bar ${udid} override --cellularBars 4`,
  ];
  
  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch {
      // Some options may not be available on older simulators
    }
  }
}

/**
 * Clear status bar override
 */
export function clearStatusBar(udid: string = 'booted'): void {
  try {
    execSync(`xcrun simctl status_bar ${udid} clear`, { stdio: 'pipe' });
  } catch {
    // Ignore errors
  }
}

/**
 * Take a screenshot from the simulator
 */
export function takeSimulatorScreenshot(outputPath: string, udid: string = 'booted'): boolean {
  try {
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    execSync(`xcrun simctl io ${udid} screenshot "${outputPath}"`, { stdio: 'pipe' });
    return existsSync(outputPath);
  } catch {
    return false;
  }
}

/**
 * Build and install an iOS app on the simulator
 */
export function buildAndInstallApp(options: {
  projectPath: string;
  scheme: string;
  udid?: string;
  isWorkspace?: boolean;
}): { success: boolean; bundleId?: string; error?: string } {
  const { projectPath, scheme, udid = 'booted', isWorkspace = false } = options;
  
  const projectFlag = isWorkspace ? '-workspace' : '-project';
  
  try {
    // Build for simulator
    const buildDir = `/tmp/isolated-sim-build-${Date.now()}`;
    
    execSync(
      `xcodebuild ${projectFlag} "${projectPath}" -scheme "${scheme}" ` +
      `-destination "platform=iOS Simulator,id=${udid}" ` +
      `-derivedDataPath "${buildDir}" build`,
      { stdio: 'pipe', encoding: 'utf-8' }
    );
    
    // Find the built app
    const appPath = execSync(
      `find "${buildDir}" -name "*.app" -type d | head -1`,
      { encoding: 'utf-8' }
    ).trim();
    
    if (!appPath) {
      return { success: false, error: 'Could not find built .app' };
    }
    
    // Get bundle ID
    const bundleId = execSync(
      `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${appPath}/Info.plist"`,
      { encoding: 'utf-8' }
    ).trim();
    
    // Install on simulator
    execSync(`xcrun simctl install ${udid} "${appPath}"`, { stdio: 'pipe' });
    
    // Launch the app
    execSync(`xcrun simctl launch ${udid} ${bundleId}`, { stdio: 'pipe' });
    
    return { success: true, bundleId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Get accessibility tree using idb
 */
export function describeAccessibility(udid: string = 'booted'): AccessibilityElement[] | null {
  if (!hasIdb()) return null;
  
  try {
    const output = execSync(`idb ui describe-all --json --udid ${udid}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    return JSON.parse(output);
  } catch {
    return null;
  }
}

/**
 * Tap at coordinates using idb
 */
export function tap(x: number, y: number, udid: string = 'booted'): boolean {
  if (!hasIdb()) {
    // Fall back to simctl
    // Note: simctl doesn't have tap, but we can try using accessibility
    return false;
  }
  
  try {
    execSync(`idb ui tap ${x} ${y} --udid ${udid}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Swipe gesture using idb
 */
export function swipe(
  x1: number, y1: number,
  x2: number, y2: number,
  udid: string = 'booted'
): boolean {
  if (!hasIdb()) return false;
  
  try {
    execSync(`idb ui swipe ${x1} ${y1} ${x2} ${y2} --duration 0.3 --udid ${udid}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Type text using idb
 */
export function typeText(text: string, udid: string = 'booted'): boolean {
  if (!hasIdb()) return false;
  
  try {
    execSync(`idb ui text "${text}" --udid ${udid}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Press hardware button
 */
export function pressButton(button: 'HOME' | 'LOCK' | 'SIDE_BUTTON' | 'SIRI', udid: string = 'booted'): boolean {
  if (!hasIdb()) return false;
  
  try {
    execSync(`idb ui button ${button} --udid ${udid}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Perform back gesture (swipe from left edge)
 */
export function goBack(udid: string = 'booted'): boolean {
  return swipe(5, 400, 300, 400, udid);
}

/**
 * Scroll down
 */
export function scrollDown(udid: string = 'booted'): boolean {
  return swipe(200, 600, 200, 300, udid);
}

/**
 * Scroll up
 */
export function scrollUp(udid: string = 'booted'): boolean {
  return swipe(200, 300, 200, 600, udid);
}

/**
 * Terminate an app
 */
export function terminateApp(bundleId: string, udid: string = 'booted'): void {
  try {
    execSync(`xcrun simctl terminate ${udid} ${bundleId}`, { stdio: 'pipe' });
  } catch {
    // Ignore errors
  }
}

/**
 * Launch an app
 */
export function launchApp(bundleId: string, udid: string = 'booted'): boolean {
  try {
    execSync(`xcrun simctl launch ${udid} ${bundleId}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
