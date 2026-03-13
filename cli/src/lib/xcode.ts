import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

export interface XcodeProject {
  path: string;
  name: string;
  type: 'xcodeproj' | 'xcworkspace';
  schemes: string[];
  bundleId?: string;
  marketingVersion?: string;
  buildNumber?: string;
  minOsVersion?: string;
}

/**
 * Detect Xcode project in the current directory
 */
export function detectXcodeProject(dir: string = process.cwd()): XcodeProject | null {
  // Look for .xcworkspace first (takes precedence)
  const files = readdirSync(dir);
  
  let projectPath: string | null = null;
  let projectType: 'xcodeproj' | 'xcworkspace' = 'xcodeproj';
  
  for (const file of files) {
    if (file.endsWith('.xcworkspace') && !file.includes('project.xcworkspace')) {
      projectPath = join(dir, file);
      projectType = 'xcworkspace';
      break;
    }
  }
  
  if (!projectPath) {
    for (const file of files) {
      if (file.endsWith('.xcodeproj')) {
        projectPath = join(dir, file);
        projectType = 'xcodeproj';
        break;
      }
    }
  }
  
  if (!projectPath) return null;
  
  const name = basename(projectPath).replace(/\.(xcodeproj|xcworkspace)$/, '');
  const schemes = getSchemes(projectPath, projectType);
  
  // Get version info
  const versionInfo = getVersionInfo(dir);
  
  // Get bundle ID from first scheme's build settings
  const bundleId = schemes.length > 0 ? getBundleId(dir, schemes[0]) : undefined;
  
  return {
    path: projectPath,
    name,
    type: projectType,
    schemes,
    bundleId,
    ...versionInfo,
  };
}

/**
 * Get available schemes
 */
function getSchemes(projectPath: string, type: 'xcodeproj' | 'xcworkspace'): string[] {
  try {
    const flag = type === 'xcworkspace' ? '-workspace' : '-project';
    const output = execSync(
      `xcodebuild ${flag} "${projectPath}" -list -json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    const data = JSON.parse(output);
    const key = type === 'xcworkspace' ? 'workspace' : 'project';
    return data[key]?.schemes || [];
  } catch {
    return [];
  }
}

/**
 * Get marketing version and build number using agvtool or xcodebuild
 */
function getVersionInfo(dir: string): { marketingVersion?: string; buildNumber?: string } {
  const result: { marketingVersion?: string; buildNumber?: string } = {};
  
  // Try agvtool first
  try {
    const marketingOutput = execSync('xcrun agvtool what-marketing-version -terse1', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const version = marketingOutput.trim();
    if (version) {
      result.marketingVersion = version;
    }
  } catch {
    // agvtool not configured
  }
  
  try {
    const buildOutput = execSync('xcrun agvtool what-version -terse', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const build = buildOutput.trim();
    if (build) {
      result.buildNumber = build;
    }
  } catch {
    // agvtool not configured
  }
  
  // Fallback: try to extract from project.pbxproj directly
  if (!result.marketingVersion || !result.buildNumber) {
    try {
      const projectFiles = readdirSync(dir).filter(f => f.endsWith('.xcodeproj'));
      if (projectFiles.length > 0) {
        const pbxprojPath = join(dir, projectFiles[0], 'project.pbxproj');
        if (existsSync(pbxprojPath)) {
          const content = readFileSync(pbxprojPath, 'utf-8');
          
          if (!result.marketingVersion) {
            const versionMatch = content.match(/MARKETING_VERSION\s*=\s*([^;]+);/);
            if (versionMatch) {
              result.marketingVersion = versionMatch[1].trim().replace(/"/g, '');
            }
          }
          
          if (!result.buildNumber) {
            const buildMatch = content.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
            if (buildMatch) {
              result.buildNumber = buildMatch[1].trim().replace(/"/g, '');
            }
          }
        }
      }
    } catch {
      // Fallback failed
    }
  }
  
  return result;
}

/**
 * Get bundle identifier from build settings
 */
function getBundleId(dir: string, scheme: string): string | undefined {
  try {
    const output = execSync(
      `xcodebuild -scheme "${scheme}" -showBuildSettings 2>/dev/null | grep PRODUCT_BUNDLE_IDENTIFIER | head -1`,
      { cwd: dir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    const match = output.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*(.+)/);
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Bump the build number
 */
export function bumpBuildNumber(dir: string = process.cwd()): string | null {
  try {
    execSync('xcrun agvtool next-version -all', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    const newVersion = execSync('xcrun agvtool what-version -terse', {
      cwd: dir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    return newVersion.trim();
  } catch {
    return null;
  }
}

/**
 * Find the most recent .zip file for release
 */
export function findReleaseZip(dir: string = process.cwd()): string | null {
  try {
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.zip'))
      .map(f => {
        const fullPath = join(dir, f);
        return {
          name: f,
          path: fullPath,
          mtime: statSync(fullPath).mtime,
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Prefer *-macOS.zip pattern
    const macosZip = files.find(f => f.name.includes('-macOS.zip'));
    if (macosZip) return macosZip.path;
    
    // Fall back to most recent .zip
    return files.length > 0 ? files[0].path : null;
  } catch {
    return null;
  }
}

/**
 * Parse CHANGELOG.md and extract latest release notes
 */
export function parseChangelog(dir: string = process.cwd()): string | null {
  const changelogPath = join(dir, 'CHANGELOG.md');
  
  if (!existsSync(changelogPath)) return null;
  
  try {
    const content = readFileSync(changelogPath, 'utf-8');
    const lines = content.split('\n');
    
    let inVersion = false;
    let notes: string[] = [];
    
    for (const line of lines) {
      // Match version headers like "## [1.2.3]" or "## 1.2.3"
      if (/^##\s+\[?\d+\.\d+/.test(line)) {
        if (inVersion) {
          // We've hit the next version, stop
          break;
        }
        inVersion = true;
        continue;
      }
      
      if (inVersion && line.trim()) {
        notes.push(line);
      }
    }
    
    return notes.length > 0 ? notes.join('\n').trim() : null;
  } catch {
    return null;
  }
}

/**
 * Parse CHANGELOG.md and extract release notes for a specific version
 */
export function parseChangelogForVersion(version: string, filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let inTargetVersion = false;
    let notes: string[] = [];
    
    // Normalize version (remove leading 'v' if present)
    const normalizedVersion = version.replace(/^v/, '');
    
    for (const line of lines) {
      // Match version headers like "## [1.2.3]" or "## 1.2.3" or "## v1.2.3"
      const versionMatch = line.match(/^##\s+\[?v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        if (inTargetVersion) {
          // We've hit the next version, stop
          break;
        }
        // Check if this is the version we're looking for
        if (versionMatch[1] === normalizedVersion) {
          inTargetVersion = true;
        }
        continue;
      }
      
      if (inTargetVersion && line.trim()) {
        notes.push(line);
      }
    }
    
    return notes.length > 0 ? notes.join('\n').trim() : null;
  } catch {
    return null;
  }
}

/**
 * Derive app slug from bundle ID or project name
 */
export function deriveSlug(project: XcodeProject): string {
  // Try bundle ID: com.example.MyApp -> my-app
  // Handle cases like com.bontecou.time.md -> time-md (last 2 parts if last is short)
  if (project.bundleId) {
    const parts = project.bundleId.split('.');
    
    // If we have enough parts and the last one is very short (like "md"),
    // combine the last two parts
    let appName: string;
    if (parts.length >= 3 && parts[parts.length - 1].length <= 3) {
      appName = parts.slice(-2).join('-');
    } else {
      appName = parts[parts.length - 1];
    }
    
    const slug = appName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // If slug is still too short, fall back to project name
    if (slug.length >= 3) {
      return slug;
    }
  }
  
  // Fall back to project name
  return project.name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
