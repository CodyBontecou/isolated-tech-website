import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFS, createMockExec, fixtures } from '../mocks/index.js';

// Mock fs
const mockFS = createMockFS();
vi.mock('fs', () => ({
  existsSync: mockFS.existsSync,
  readFileSync: mockFS.readFileSync,
  readdirSync: mockFS.readdirSync,
  statSync: mockFS.statSync,
}));

// Mock child_process
const mockExec = createMockExec();
vi.mock('child_process', () => ({
  execSync: mockExec.execSync,
}));

describe('Xcode utilities', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFS.reset();
    mockExec.reset();
  });

  describe('detectXcodeProject', () => {
    it('should find .xcodeproj in directory', async () => {
      mockFS.setFile('/project/MyApp.xcodeproj/project.pbxproj', fixtures.pbxprojContent);
      mockFS.dirs.add('/project/MyApp.xcodeproj');
      
      // Mock xcodebuild -list
      mockExec.setOutput('-list', JSON.stringify({
        project: { schemes: ['MyApp'] },
      }));
      
      // Mock agvtool
      mockExec.setOutput('what-marketing-version', '1.2.3');
      mockExec.setOutput('what-version -terse', '42');
      
      const { detectXcodeProject } = await import('../../src/lib/xcode.js');
      const project = detectXcodeProject('/project');
      
      expect(project).not.toBeNull();
      expect(project?.name).toBe('MyApp');
      expect(project?.type).toBe('xcodeproj');
    });

    it('should prefer .xcworkspace over .xcodeproj', async () => {
      mockFS.setFile('/project/MyApp.xcodeproj/project.pbxproj', fixtures.pbxprojContent);
      mockFS.setFile('/project/MyApp.xcworkspace/contents.xcworkspacedata', '{}');
      mockFS.dirs.add('/project/MyApp.xcodeproj');
      mockFS.dirs.add('/project/MyApp.xcworkspace');
      
      mockExec.setOutput('-list', JSON.stringify({
        workspace: { schemes: ['MyApp', 'MyAppTests'] },
      }));
      mockExec.setOutput('what-marketing-version', '1.0.0');
      mockExec.setOutput('what-version -terse', '1');
      
      const { detectXcodeProject } = await import('../../src/lib/xcode.js');
      const project = detectXcodeProject('/project');
      
      expect(project?.type).toBe('xcworkspace');
      expect(project?.schemes).toContain('MyApp');
    });

    it('should ignore project.xcworkspace inside xcodeproj', async () => {
      mockFS.setFile('/project/MyApp.xcodeproj/project.pbxproj', fixtures.pbxprojContent);
      mockFS.setFile('/project/MyApp.xcodeproj/project.xcworkspace/contents.xcworkspacedata', '{}');
      mockFS.dirs.add('/project/MyApp.xcodeproj');
      
      mockExec.setOutput('-list', JSON.stringify({
        project: { schemes: ['MyApp'] },
      }));
      mockExec.setOutput('what-marketing-version', '1.0.0');
      mockExec.setOutput('what-version -terse', '1');
      
      const { detectXcodeProject } = await import('../../src/lib/xcode.js');
      const project = detectXcodeProject('/project');
      
      expect(project?.type).toBe('xcodeproj');
    });

    it('should return null when no project found', async () => {
      const { detectXcodeProject } = await import('../../src/lib/xcode.js');
      const project = detectXcodeProject('/empty');
      
      expect(project).toBeNull();
    });

    it('should extract version from pbxproj when agvtool fails', async () => {
      mockFS.setFile('/project/MyApp.xcodeproj/project.pbxproj', `
        MARKETING_VERSION = 2.0.0;
        CURRENT_PROJECT_VERSION = 100;
      `);
      mockFS.dirs.add('/project/MyApp.xcodeproj');
      
      mockExec.setOutput('-list', JSON.stringify({
        project: { schemes: ['MyApp'] },
      }));
      // agvtool fails
      mockExec.setError('agvtool');
      
      const { detectXcodeProject } = await import('../../src/lib/xcode.js');
      const project = detectXcodeProject('/project');
      
      expect(project?.marketingVersion).toBe('2.0.0');
      expect(project?.buildNumber).toBe('100');
    });
  });

  describe('findReleaseZip', () => {
    it('should find most recent .zip file', async () => {
      const now = Date.now();
      
      // Older file
      mockFS.files.set('/project/OldApp.zip', 'old content');
      mockFS.statSync.mockImplementation((path: string) => ({
        size: 1000,
        mtime: path.includes('Old') ? new Date(now - 10000) : new Date(now),
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      // Newer file
      mockFS.files.set('/project/NewApp.zip', 'new content');
      
      const { findReleaseZip } = await import('../../src/lib/xcode.js');
      const zipPath = findReleaseZip('/project');
      
      expect(zipPath).toBe('/project/NewApp.zip');
    });

    it('should prefer *-macOS.zip pattern', async () => {
      const now = Date.now();
      
      mockFS.files.set('/project/App.zip', 'content');
      mockFS.files.set('/project/App-macOS.zip', 'content');
      
      mockFS.statSync.mockImplementation((path: string) => ({
        size: 1000,
        mtime: new Date(now),
        isFile: () => true,
        isDirectory: () => false,
      }));
      
      const { findReleaseZip } = await import('../../src/lib/xcode.js');
      const zipPath = findReleaseZip('/project');
      
      expect(zipPath).toBe('/project/App-macOS.zip');
    });

    it('should return null when no zip files exist', async () => {
      const { findReleaseZip } = await import('../../src/lib/xcode.js');
      const zipPath = findReleaseZip('/project');
      
      expect(zipPath).toBeNull();
    });
  });

  describe('parseChangelog', () => {
    it('should extract notes from latest version', async () => {
      mockFS.setFile('/project/CHANGELOG.md', `
# Changelog

## [1.2.0] - 2024-01-15

### Added
- New feature A
- New feature B

### Fixed
- Bug fix C

## [1.1.0] - 2024-01-01

- Old changes
`);
      
      const { parseChangelog } = await import('../../src/lib/xcode.js');
      const notes = parseChangelog('/project');
      
      expect(notes).toContain('New feature A');
      expect(notes).toContain('Bug fix C');
      expect(notes).not.toContain('Old changes');
    });

    it('should return null when no CHANGELOG.md exists', async () => {
      const { parseChangelog } = await import('../../src/lib/xcode.js');
      const notes = parseChangelog('/project');
      
      expect(notes).toBeNull();
    });

    it('should handle version without brackets', async () => {
      mockFS.setFile('/project/CHANGELOG.md', `
# Changelog

## 2.0.0

- New stuff
`);
      
      const { parseChangelog } = await import('../../src/lib/xcode.js');
      const notes = parseChangelog('/project');
      
      expect(notes).toContain('New stuff');
    });
  });

  describe('deriveSlug', () => {
    it('should convert bundle ID to slug', async () => {
      const { deriveSlug } = await import('../../src/lib/xcode.js');
      
      const slug = deriveSlug({
        ...fixtures.xcodeProject,
        bundleId: 'com.example.MyAwesomeApp',
      });
      
      expect(slug).toBe('my-awesome-app');
    });

    it('should handle camelCase names', async () => {
      const { deriveSlug } = await import('../../src/lib/xcode.js');
      
      const slug = deriveSlug({
        ...fixtures.xcodeProject,
        bundleId: 'com.company.SuperCoolTool',
      });
      
      expect(slug).toBe('super-cool-tool');
    });

    it('should combine short last parts', async () => {
      const { deriveSlug } = await import('../../src/lib/xcode.js');
      
      // e.g., com.bontecou.time.md -> time-md
      const slug = deriveSlug({
        ...fixtures.xcodeProject,
        bundleId: 'com.bontecou.time.md',
      });
      
      expect(slug).toBe('time-md');
    });

    it('should fall back to project name when no bundle ID', async () => {
      const { deriveSlug } = await import('../../src/lib/xcode.js');
      
      const slug = deriveSlug({
        ...fixtures.xcodeProject,
        bundleId: undefined,
        name: 'CoolProject',
      });
      
      expect(slug).toBe('cool-project');
    });

    it('should remove special characters', async () => {
      const { deriveSlug } = await import('../../src/lib/xcode.js');
      
      const slug = deriveSlug({
        ...fixtures.xcodeProject,
        bundleId: 'com.example.App_With_Underscores',
      });
      
      // Underscores become hyphens, then normalized
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('bumpBuildNumber', () => {
    it('should call agvtool to bump version', async () => {
      mockExec.setOutput('next-version', 'New version: 43');
      mockExec.setOutput('what-version -terse', '43');
      
      const { bumpBuildNumber } = await import('../../src/lib/xcode.js');
      const newVersion = bumpBuildNumber('/project');
      
      expect(newVersion).toBe('43');
      const hasAgvtoolCall = mockExec.calls.some(cmd => cmd.includes('agvtool next-version'));
      expect(hasAgvtoolCall).toBe(true);
    });

    it('should return null when agvtool fails', async () => {
      mockExec.setError('agvtool');
      
      const { bumpBuildNumber } = await import('../../src/lib/xcode.js');
      const newVersion = bumpBuildNumber('/project');
      
      expect(newVersion).toBeNull();
    });
  });
});


