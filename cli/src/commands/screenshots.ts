import { Command } from 'commander';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { detectXcodeProject } from '../lib/xcode.js';
import { api } from '../lib/api.js';
import { isAuthenticated } from '../lib/config.js';
import { output, success, error, info, warn, banner, isJsonMode } from '../lib/output.js';
import * as simulator from '../lib/simulator.js';
import * as macosApp from '../lib/macos-app.js';

// ============================================================================
// Main screenshots command
// ============================================================================

export const screenshotsCommand = new Command('screenshots')
  .description('Capture and manage app screenshots for marketing')
  .addCommand(iosCommand())
  .addCommand(macosCommand())
  .addCommand(uploadCommand());

// ============================================================================
// iOS Simulator Screenshots
// ============================================================================

function iosCommand(): Command {
  const cmd = new Command('ios')
    .description('iOS Simulator screenshot utilities');
  
  // isolated screenshots ios boot
  cmd.command('boot')
    .description('Boot an iOS Simulator')
    .option('--device <name>', 'Device name (e.g., "iPhone 16 Pro")', 'iPhone 16 Pro')
    .action(async (opts) => {
      if (isJsonMode()) {
        const device = simulator.bootSimulator(opts.device);
        output({ success: !!device, device });
        return;
      }
      
      banner('Boot iOS Simulator');
      info(`Booting ${opts.device}...`);
      
      const device = simulator.bootSimulator(opts.device);
      if (device) {
        success(`Simulator booted: ${device.name}`, {
          udid: device.udid,
          runtime: device.runtime,
        });
      } else {
        error('boot_failed', `Could not boot simulator: ${opts.device}`, 'Check available devices with: xcrun simctl list devices');
      }
    });
  
  // isolated screenshots ios status-bar
  cmd.command('status-bar')
    .description('Set clean status bar (9:41, full battery)')
    .option('--clear', 'Clear status bar override')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (opts) => {
      const udid = opts.udid || 'booted';
      
      if (opts.clear) {
        simulator.clearStatusBar(udid);
        success('Status bar cleared');
      } else {
        simulator.cleanStatusBar(udid);
        success('Status bar set to clean state (9:41, full battery)');
      }
    });
  
  // isolated screenshots ios build
  cmd.command('build')
    .description('Build and install app on simulator')
    .option('--scheme <scheme>', 'Xcode scheme to build')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (opts) => {
      const project = detectXcodeProject();
      if (!project) {
        error('no_project', 'No Xcode project found');
        return;
      }
      
      const scheme = opts.scheme || project.schemes[0];
      if (!scheme) {
        error('no_scheme', 'No scheme specified and none auto-detected');
        return;
      }
      
      if (!isJsonMode()) {
        banner('Build for iOS Simulator');
        info(`Project: ${project.path}`);
        info(`Scheme: ${scheme}`);
      }
      
      const result = simulator.buildAndInstallApp({
        projectPath: project.path,
        scheme,
        udid: opts.udid,
        isWorkspace: project.type === 'xcworkspace',
      });
      
      if (isJsonMode()) {
        output(result);
        return;
      }
      
      if (result.success) {
        success('App built and installed', { bundleId: result.bundleId });
      } else {
        error('build_failed', result.error || 'Build failed');
      }
    });
  
  // isolated screenshots ios capture
  cmd.command('capture')
    .description('Take a screenshot from the simulator')
    .argument('<output>', 'Output file path')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (outputPath, opts) => {
      const ok = simulator.takeSimulatorScreenshot(outputPath, opts.udid || 'booted');
      
      if (isJsonMode()) {
        output({ success: ok, path: outputPath });
        return;
      }
      
      if (ok) {
        success(`Screenshot saved: ${outputPath}`);
      } else {
        error('capture_failed', 'Failed to capture screenshot');
      }
    });
  
  // isolated screenshots ios tap
  cmd.command('tap')
    .description('Tap at screen coordinates')
    .argument('<x>', 'X coordinate (device points)')
    .argument('<y>', 'Y coordinate (device points)')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (x, y, opts) => {
      if (!simulator.hasIdb()) {
        error('no_idb', 'idb not installed', 'Install: pip install fb-idb');
        return;
      }
      
      const ok = simulator.tap(parseFloat(x), parseFloat(y), opts.udid || 'booted');
      
      if (isJsonMode()) {
        output({ success: ok, x: parseFloat(x), y: parseFloat(y) });
      } else if (ok) {
        success(`Tapped at (${x}, ${y})`);
      } else {
        error('tap_failed', 'Tap failed');
      }
    });
  
  // isolated screenshots ios swipe
  cmd.command('swipe')
    .description('Swipe gesture')
    .argument('<x1>', 'Start X')
    .argument('<y1>', 'Start Y')
    .argument('<x2>', 'End X')
    .argument('<y2>', 'End Y')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (x1, y1, x2, y2, opts) => {
      if (!simulator.hasIdb()) {
        error('no_idb', 'idb not installed');
        return;
      }
      
      const ok = simulator.swipe(
        parseFloat(x1), parseFloat(y1),
        parseFloat(x2), parseFloat(y2),
        opts.udid || 'booted'
      );
      
      if (ok) {
        success(`Swiped (${x1},${y1}) → (${x2},${y2})`);
      } else {
        error('swipe_failed', 'Swipe failed');
      }
    });
  
  // isolated screenshots ios type
  cmd.command('type')
    .description('Type text into focused field')
    .argument('<text>', 'Text to type')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (text, opts) => {
      if (!simulator.hasIdb()) {
        error('no_idb', 'idb not installed');
        return;
      }
      
      const ok = simulator.typeText(text, opts.udid || 'booted');
      if (ok) {
        success(`Typed: ${text}`);
      } else {
        error('type_failed', 'Type failed');
      }
    });
  
  // isolated screenshots ios describe
  cmd.command('describe')
    .description('Get accessibility tree of current screen')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (opts) => {
      if (!simulator.hasIdb()) {
        error('no_idb', 'idb not installed', 'Install: pip install fb-idb');
        return;
      }
      
      const tree = simulator.describeAccessibility(opts.udid || 'booted');
      
      if (tree) {
        if (isJsonMode()) {
          output(tree);
        } else {
          console.log(JSON.stringify(tree, null, 2));
        }
      } else {
        error('describe_failed', 'Failed to get accessibility tree');
      }
    });
  
  // isolated screenshots ios back
  cmd.command('back')
    .description('Perform back gesture (swipe from left edge)')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (opts) => {
      const ok = simulator.goBack(opts.udid || 'booted');
      if (ok) success('Back gesture performed');
      else error('back_failed', 'Back gesture failed');
    });
  
  // isolated screenshots ios scroll
  cmd.command('scroll')
    .description('Scroll the current view')
    .argument('<direction>', 'up or down')
    .option('--udid <udid>', 'Target simulator UDID')
    .action(async (direction, opts) => {
      const ok = direction === 'up'
        ? simulator.scrollUp(opts.udid || 'booted')
        : simulator.scrollDown(opts.udid || 'booted');
      
      if (ok) success(`Scrolled ${direction}`);
      else error('scroll_failed', 'Scroll failed');
    });
  
  return cmd;
}

// ============================================================================
// macOS App Screenshots
// ============================================================================

function macosCommand(): Command {
  const cmd = new Command('macos')
    .description('macOS app screenshot utilities');
  
  // isolated screenshots macos build
  cmd.command('build')
    .description('Build and launch macOS app')
    .option('--scheme <scheme>', 'Xcode scheme to build')
    .option('--configuration <config>', 'Build configuration', 'Release')
    .action(async (opts) => {
      const project = detectXcodeProject();
      if (!project) {
        error('no_project', 'No Xcode project found');
        return;
      }
      
      const scheme = opts.scheme || project.schemes[0];
      if (!scheme) {
        error('no_scheme', 'No scheme specified');
        return;
      }
      
      if (!isJsonMode()) {
        banner('Build macOS App');
        info(`Project: ${project.path}`);
        info(`Scheme: ${scheme}`);
      }
      
      const result = macosApp.buildAndLaunchMacApp({
        projectPath: project.path,
        scheme,
        isWorkspace: project.type === 'xcworkspace',
        configuration: opts.configuration,
      });
      
      if (isJsonMode()) {
        output(result);
        return;
      }
      
      if (result.success) {
        success('App built and launched', {
          bundleId: result.bundleId,
          appPath: result.appPath,
        });
      } else {
        error('build_failed', result.error || 'Build failed');
      }
    });
  
  // isolated screenshots macos prepare
  cmd.command('prepare')
    .description('Prepare window for screenshots (resize, center, hide others)')
    .requiredOption('--bundle-id <id>', 'App bundle identifier')
    .option('--width <w>', 'Window width', '1440')
    .option('--height <h>', 'Window height', '900')
    .action(async (opts) => {
      const ok = macosApp.prepareWindow(
        opts.bundleId,
        parseInt(opts.width),
        parseInt(opts.height)
      );
      
      if (isJsonMode()) {
        output({ success: ok, width: parseInt(opts.width), height: parseInt(opts.height) });
        return;
      }
      
      if (ok) {
        success(`Window prepared: ${opts.width}x${opts.height}`);
      } else {
        error('prepare_failed', 'Failed to prepare window', 'Make sure the app is running');
      }
    });
  
  // isolated screenshots macos capture
  cmd.command('capture')
    .description('Take a screenshot of the app window')
    .argument('<output>', 'Output file path')
    .requiredOption('--bundle-id <id>', 'App bundle identifier')
    .action(async (outputPath, opts) => {
      const ok = macosApp.takeMacScreenshot(outputPath, opts.bundleId);
      
      if (isJsonMode()) {
        output({ success: ok, path: outputPath });
        return;
      }
      
      if (ok) {
        success(`Screenshot saved: ${outputPath}`);
      } else {
        error('capture_failed', 'Failed to capture screenshot');
      }
    });
  
  // isolated screenshots macos click
  cmd.command('click')
    .description('Click at coordinates or element')
    .argument('[x]', 'X coordinate')
    .argument('[y]', 'Y coordinate')
    .option('--bundle-id <id>', 'App bundle identifier')
    .option('--title <title>', 'Click element by title')
    .option('--identifier <id>', 'Click element by accessibility identifier')
    .action(async (x, y, opts) => {
      let ok: boolean;
      
      if (opts.title || opts.identifier) {
        if (!opts.bundleId) {
          error('missing_bundle_id', '--bundle-id required when using --title or --identifier');
          return;
        }
        ok = macosApp.clickElement(opts.bundleId, {
          title: opts.title,
          identifier: opts.identifier,
        });
        if (ok) success(`Clicked element: ${opts.title || opts.identifier}`);
      } else if (x && y) {
        ok = macosApp.click(parseFloat(x), parseFloat(y));
        if (ok) success(`Clicked at (${x}, ${y})`);
      } else {
        error('missing_args', 'Provide coordinates (x y) or --title/--identifier');
        return;
      }
      
      if (!ok) error('click_failed', 'Click failed');
    });
  
  // isolated screenshots macos key
  cmd.command('key')
    .description('Press a key or key combination')
    .argument('<key>', 'Key to press (e.g., Return, Escape, cmd+s)')
    .action(async (key) => {
      const ok = macosApp.pressKey(key);
      if (ok) success(`Pressed: ${key}`);
      else error('key_failed', 'Key press failed');
    });
  
  // isolated screenshots macos menu
  cmd.command('menu')
    .description('Click a menu item')
    .argument('<menu>', 'Menu name (e.g., File)')
    .argument('<item>', 'Menu item name')
    .argument('[submenu]', 'Submenu item (optional)')
    .requiredOption('--bundle-id <id>', 'App bundle identifier')
    .action(async (menu, item, submenu, opts) => {
      const ok = macosApp.clickMenu(opts.bundleId, menu, item, submenu);
      
      const path = submenu ? `${menu} > ${item} > ${submenu}` : `${menu} > ${item}`;
      if (ok) success(`Clicked menu: ${path}`);
      else error('menu_failed', `Failed to click menu: ${path}`);
    });
  
  // isolated screenshots macos describe
  cmd.command('describe')
    .description('Get accessibility tree of app window')
    .requiredOption('--bundle-id <id>', 'App bundle identifier')
    .action(async (opts) => {
      const tree = macosApp.describeAccessibility(opts.bundleId);
      
      if (tree) {
        console.log(tree);
      } else {
        error('describe_failed', 'Failed to get accessibility tree');
      }
    });
  
  // isolated screenshots macos scroll
  cmd.command('scroll')
    .description('Scroll in the app window')
    .argument('<direction>', 'up or down')
    .requiredOption('--bundle-id <id>', 'App bundle identifier')
    .action(async (direction, opts) => {
      const ok = macosApp.scroll(opts.bundleId, direction as 'up' | 'down');
      if (ok) success(`Scrolled ${direction}`);
      else error('scroll_failed', 'Scroll failed');
    });
  
  return cmd;
}

// ============================================================================
// Upload to isolated.tech
// ============================================================================

function uploadCommand(): Command {
  return new Command('upload')
    .description('Upload screenshots to isolated.tech')
    .requiredOption('--slug <slug>', 'App slug on isolated.tech')
    .option('--dir <directory>', 'Screenshots directory', './screenshots')
    .option('--dry-run', 'Show what would be uploaded without uploading')
    .action(async (opts) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        return;
      }
      
      if (!existsSync(opts.dir)) {
        error('no_dir', `Directory not found: ${opts.dir}`);
        return;
      }
      
      // Find screenshots
      const files = readdirSync(opts.dir)
        .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
        .sort();
      
      if (files.length === 0) {
        error('no_screenshots', 'No screenshots found in directory');
        return;
      }
      
      if (!isJsonMode()) {
        banner('Upload Screenshots');
        info(`App: ${opts.slug}`);
        info(`Found ${files.length} screenshots`);
        console.log();
      }
      
      // Parse titles from filenames
      const screenshots = files.map(f => {
        // "iOS - 01 - Home.png" -> "iOS - Home"
        let title = f.replace(/\.(png|jpg|jpeg)$/i, '');
        title = title.replace(/ - \d+ - /, ' - ').replace(/^\d+ - /, '');
        
        return {
          file: f,
          path: join(opts.dir, f),
          title,
        };
      });
      
      if (opts.dryRun) {
        if (isJsonMode()) {
          output({ dryRun: true, screenshots });
        } else {
          screenshots.forEach(s => info(`${s.file} → "${s.title}"`));
          console.log();
          warn('Dry run - no files uploaded');
        }
        return;
      }
      
      // Get app ID from slug
      const appResponse = await api.getApp(opts.slug);
      if (!appResponse.success || !appResponse.data) {
        error('app_not_found', `App not found: ${opts.slug}`);
        return;
      }
      
      const appId = appResponse.data.id;
      const results: Array<{ file: string; success: boolean; error?: string }> = [];
      
      for (let i = 0; i < screenshots.length; i++) {
        const s = screenshots[i];
        
        if (!isJsonMode()) {
          process.stdout.write(`Uploading ${s.file}... `);
        }
        
        try {
          const uploadResult = await api.uploadMedia(appId, s.path, s.title, i);
          
          if (uploadResult.success) {
            results.push({ file: s.file, success: true });
            if (!isJsonMode()) console.log('✓');
          } else {
            results.push({ file: s.file, success: false, error: uploadResult.error });
            if (!isJsonMode()) console.log('✗', uploadResult.error);
          }
        } catch (e: any) {
          results.push({ file: s.file, success: false, error: e.message });
          if (!isJsonMode()) console.log('✗', e.message);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      if (isJsonMode()) {
        output({ success: successCount === results.length, uploaded: successCount, total: results.length, results });
      } else {
        console.log();
        if (successCount === results.length) {
          success(`All ${successCount} screenshots uploaded`);
        } else {
          warn(`Uploaded ${successCount}/${results.length} screenshots`);
        }
        info(`View at: https://isolated.tech/apps/${opts.slug}`);
      }
    });
}
