import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, cpSync } from 'fs';
import { join, dirname, basename } from 'path';

export interface MacOSAccessibilityElement {
  role: string;
  title?: string;
  description?: string;
  value?: string;
  identifier?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  enabled: boolean;
}

/**
 * Get app name from bundle ID
 */
export function getAppNameFromBundleId(bundleId: string): string | null {
  try {
    const output = execSync(
      `osascript -e 'tell application "System Events" to get name of first process whose bundle identifier is "${bundleId}"'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Build and launch a macOS app
 */
export function buildAndLaunchMacApp(options: {
  projectPath: string;
  scheme: string;
  isWorkspace?: boolean;
  configuration?: string;
}): { success: boolean; appPath?: string; bundleId?: string; error?: string } {
  const { projectPath, scheme, isWorkspace = false, configuration = 'Release' } = options;
  
  const projectFlag = isWorkspace ? '-workspace' : '-project';
  const buildDir = `/tmp/isolated-mac-build-${Date.now()}`;
  
  try {
    // Build the app
    execSync(
      `xcodebuild ${projectFlag} "${projectPath}" -scheme "${scheme}" ` +
      `-configuration "${configuration}" -destination "platform=macOS" ` +
      `-derivedDataPath "${buildDir}" build 2>&1`,
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
    
    // Copy to stable location
    const stableDir = join(process.env.HOME || '/tmp', '.isolated-screenshots');
    if (!existsSync(stableDir)) {
      mkdirSync(stableDir, { recursive: true });
    }
    
    const appName = basename(appPath);
    const stableAppPath = join(stableDir, appName);
    
    // Remove old version
    if (existsSync(stableAppPath)) {
      rmSync(stableAppPath, { recursive: true });
    }
    cpSync(appPath, stableAppPath, { recursive: true });
    
    // Get bundle ID
    const bundleId = execSync(
      `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${stableAppPath}/Contents/Info.plist"`,
      { encoding: 'utf-8' }
    ).trim();
    
    // Launch the app
    execSync(`open "${stableAppPath}"`, { stdio: 'pipe' });
    
    // Wait for launch
    execSync('sleep 2');
    
    return { success: true, appPath: stableAppPath, bundleId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Prepare window for screenshots (resize, center, hide others)
 */
export function prepareWindow(bundleId: string, width: number = 1440, height: number = 900): boolean {
  const appName = getAppNameFromBundleId(bundleId);
  if (!appName) return false;
  
  const script = `
    tell application "System Events"
      set visible of every process whose bundle identifier is not "${bundleId}" to false
    end tell
    
    tell application "${appName}"
      activate
    end tell
    
    delay 0.3
    
    tell application "System Events"
      tell process "${appName}"
        set frontmost to true
        
        tell application "Finder"
          set screenBounds to bounds of window of desktop
          set screenWidth to item 3 of screenBounds
          set screenHeight to item 4 of screenBounds
        end tell
        
        set targetX to (screenWidth - ${width}) / 2
        set targetY to (screenHeight - ${height}) / 2 + 25
        
        try
          set theWindow to first window
          set position of theWindow to {targetX, targetY}
          set size of theWindow to {${width}, ${height}}
        on error
          try
            set bounds of first window to {targetX, targetY, targetX + ${width}, targetY + ${height}}
          end try
        end try
      end tell
    end tell
  `;
  
  try {
    execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take a screenshot of a macOS app window
 */
export function takeMacScreenshot(outputPath: string, bundleId: string): boolean {
  const appName = getAppNameFromBundleId(bundleId);
  if (!appName) return false;
  
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  // Bring app to front
  try {
    execSync(`osascript -e 'tell application "${appName}" to activate'`, { stdio: 'pipe' });
    execSync('sleep 0.3');
  } catch {
    // Continue anyway
  }
  
  // Get window bounds via AppleScript
  const boundsScript = `
    tell application "System Events"
      tell process "${appName}"
        set frontmost to true
        delay 0.2
        set theWindow to first window
        set {x, y} to position of theWindow
        set {w, h} to size of theWindow
        return "" & x & " " & y & " " & w & " " & h
      end tell
    end tell
  `;
  
  try {
    const bounds = execSync(`osascript -e '${boundsScript.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    
    if (bounds) {
      const [wx, wy, ww, wh] = bounds.split(' ').map(Number);
      execSync(`screencapture -x -R${wx},${wy},${ww},${wh} "${outputPath}"`, { stdio: 'pipe' });
      return existsSync(outputPath);
    }
  } catch {
    // Fall back to window capture mode
  }
  
  // Fallback: use interactive window capture (won't work in automated mode)
  try {
    execSync(`screencapture -x -o -w "${outputPath}"`, { stdio: 'pipe' });
    return existsSync(outputPath);
  } catch {
    return false;
  }
}

/**
 * Click at screen coordinates
 */
export function click(x: number, y: number): boolean {
  // Try cliclick first (more reliable)
  try {
    execSync(`cliclick c:${x},${y}`, { stdio: 'pipe' });
    return true;
  } catch {
    // cliclick not installed, try AppleScript
  }
  
  // AppleScript fallback (less reliable)
  try {
    execSync(`osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Click an element by title in a specific app
 */
export function clickElement(bundleId: string, options: { title?: string; identifier?: string }): boolean {
  const appName = getAppNameFromBundleId(bundleId);
  if (!appName) return false;
  
  const { title, identifier } = options;
  
  let script: string;
  
  if (title) {
    script = `
      tell application "System Events"
        tell process "${appName}"
          set frontmost to true
          delay 0.1
          try
            click (first button whose title is "${title}")
            return "clicked"
          end try
          try
            click (first UI element whose title is "${title}")
            return "clicked"
          end try
          error "Could not find element"
        end tell
      end tell
    `;
  } else if (identifier) {
    script = `
      tell application "System Events"
        tell process "${appName}"
          set frontmost to true
          delay 0.1
          try
            click (first UI element whose identifier is "${identifier}")
            return "clicked"
          end try
          error "Could not find element"
        end tell
      end tell
    `;
  } else {
    return false;
  }
  
  try {
    execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Type text using AppleScript
 */
export function typeText(text: string): boolean {
  try {
    execSync(`osascript -e 'tell application "System Events" to keystroke "${text}"'`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Press a key or key combination
 */
export function pressKey(key: string): boolean {
  // Handle modifier+key combinations
  if (key.includes('+')) {
    const [modifier, keyPart] = key.split('+');
    let modClause: string;
    
    switch (modifier.toLowerCase()) {
      case 'cmd':
      case 'command':
        modClause = 'command down';
        break;
      case 'ctrl':
      case 'control':
        modClause = 'control down';
        break;
      case 'alt':
      case 'option':
        modClause = 'option down';
        break;
      case 'shift':
        modClause = 'shift down';
        break;
      default:
        return false;
    }
    
    try {
      execSync(`osascript -e 'tell application "System Events" to keystroke "${keyPart}" using {${modClause}}'`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
  
  // Special keys
  const keyCodes: Record<string, number> = {
    'return': 36,
    'enter': 36,
    'escape': 53,
    'esc': 53,
    'tab': 48,
    'space': 49,
    'delete': 51,
    'backspace': 51,
    'up': 126,
    'down': 125,
    'left': 123,
    'right': 124,
  };
  
  const keyCode = keyCodes[key.toLowerCase()];
  if (keyCode) {
    try {
      execSync(`osascript -e 'tell application "System Events" to key code ${keyCode}'`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
  
  // Regular keystroke
  try {
    execSync(`osascript -e 'tell application "System Events" to keystroke "${key}"'`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Click a menu item
 */
export function clickMenu(bundleId: string, menuName: string, itemName: string, submenuName?: string): boolean {
  const appName = getAppNameFromBundleId(bundleId);
  if (!appName) return false;
  
  let script: string;
  
  if (submenuName) {
    script = `
      tell application "${appName}" to activate
      delay 0.2
      tell application "System Events"
        tell process "${appName}"
          click menu item "${itemName}" of menu 1 of menu bar item "${menuName}" of menu bar 1
          delay 0.1
          click menu item "${submenuName}" of menu 1 of menu item "${itemName}" of menu 1 of menu bar item "${menuName}" of menu bar 1
        end tell
      end tell
    `;
  } else {
    script = `
      tell application "${appName}" to activate
      delay 0.2
      tell application "System Events"
        tell process "${appName}"
          click menu item "${itemName}" of menu 1 of menu bar item "${menuName}" of menu bar 1
        end tell
      end tell
    `;
  }
  
  try {
    execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Describe accessibility tree of an app
 */
export function describeAccessibility(bundleId: string): string | null {
  const appName = getAppNameFromBundleId(bundleId);
  if (!appName) return null;
  
  const script = `
    tell application "System Events"
      tell process "${appName}"
        set frontmost to true
        set output to ""
        
        try
          set theWindow to first window
          set output to my describeElement(theWindow, 0)
        on error errMsg
          return "Error: " & errMsg
        end try
        
        return output
      end tell
    end tell
    
    on describeElement(elem, depth)
      set indent to ""
      repeat depth times
        set indent to indent & "  "
      end repeat
      
      set output to ""
      
      try
        set elemRole to role of elem
        set elemTitle to ""
        try
          set elemTitle to title of elem
        end try
        set elemValue to ""
        try
          set elemValue to value of elem
        end try
        set elemDesc to ""
        try
          set elemDesc to description of elem
        end try
        set elemId to ""
        try
          set elemId to identifier of elem
        end try
        set elemEnabled to true
        try
          set elemEnabled to enabled of elem
        end try
        set elemPos to {0, 0}
        try
          set elemPos to position of elem
        end try
        set elemSize to {0, 0}
        try
          set elemSize to size of elem
        end try
        
        set info to indent & elemRole
        if elemTitle is not "" and elemTitle is not missing value then
          set info to info & " title=\\"" & elemTitle & "\\""
        end if
        if elemDesc is not "" and elemDesc is not missing value and elemDesc is not elemTitle then
          set info to info & " desc=\\"" & elemDesc & "\\""
        end if
        if elemValue is not "" and elemValue is not missing value then
          set info to info & " value=\\"" & elemValue & "\\""
        end if
        if elemId is not "" and elemId is not missing value then
          set info to info & " id=\\"" & elemId & "\\""
        end if
        set info to info & " pos=" & (item 1 of elemPos as text) & "," & (item 2 of elemPos as text)
        set info to info & " size=" & (item 1 of elemSize as text) & "," & (item 2 of elemSize as text)
        if not elemEnabled then
          set info to info & " [disabled]"
        end if
        
        set output to output & info & "
"
        
        if depth < 4 then
          try
            set children to UI elements of elem
            repeat with child in children
              set output to output & my describeElement(child, depth + 1)
            end repeat
          end try
        end if
        
      on error errMsg
        set output to indent & "(error: " & errMsg & ")
"
      end try
      
      return output
    end describeElement
  `;
  
  try {
    const output = execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large trees
    });
    return output;
  } catch {
    return null;
  }
}

/**
 * Scroll in the app window
 */
export function scroll(bundleId: string, direction: 'up' | 'down'): boolean {
  const appName = getAppNameFromBundleId(bundleId);
  if (!appName) return false;
  
  const keyCode = direction === 'down' ? 125 : 126; // Down : Up arrow
  
  try {
    execSync(`osascript -e '
      tell application "${appName}" to activate
      delay 0.1
      tell application "System Events"
        key code ${keyCode}
        key code ${keyCode}
        key code ${keyCode}
      end tell
    '`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Quit an app
 */
export function quitApp(bundleId: string): void {
  try {
    execSync(`osascript -e 'quit app id "${bundleId}"'`, { stdio: 'pipe' });
  } catch {
    // Ignore errors
  }
}
