# @isolated/cli

CLI for publishing macOS apps to [isolated.tech](https://isolated.tech) with Sparkle auto-updates.

Designed to be **AI-agent friendly** with structured JSON output and zero-config operation.

## Installation

```bash
npm install -g @isolated/cli
```

## Quick Start

```bash
# 1. Authenticate (opens browser, enter code shown)
isolated login

# 2. Register your app (auto-detects Xcode project)
isolated init

# 3. Build your app, then publish
isolated publish
```

## Commands

### Discovery

```bash
isolated doctor   # Diagnose what's needed to publish
isolated status   # Show current project and auth status
```

### Authentication

```bash
isolated login    # Authenticate with isolated.tech
isolated logout   # Sign out
isolated whoami   # Show current user
```

### App Management

```bash
isolated init              # Register app (auto-detects project)
isolated apps list         # List your registered apps
isolated apps versions     # List versions for an app
```

### Publishing

```bash
isolated publish           # Publish a release (auto-detects everything)
isolated publish --dry-run # Preview without uploading
```

## JSON Output (for AI Agents)

All commands support `--json` for structured output:

```bash
isolated doctor --json
```

```json
{
  "ready": true,
  "authenticated": true,
  "project": {
    "detected": true,
    "name": "MyApp",
    "version": "1.2.3",
    "build": "45"
  },
  "release": {
    "ready": true,
    "zipFile": "MyApp-v1.2.3-macOS.zip"
  }
}
```

Errors include actionable fixes:

```json
{
  "success": false,
  "error": "not_authenticated",
  "message": "Not logged in",
  "fix": "Run: isolated login"
}
```

## Zero-Config Operation

The CLI auto-detects:

- **Xcode project** - finds `.xcodeproj` or `.xcworkspace`
- **Version & build** - reads from Xcode via `agvtool`
- **App slug** - derives from bundle ID or project name
- **Release zip** - finds most recent `*-macOS.zip`
- **Changelog** - extracts from `CHANGELOG.md`
- **Signing key** - uses Sparkle tools or Keychain

## Environment Variables

```bash
ISOLATED_API_KEY    # API key (for CI, overrides login)
ISOLATED_API_URL    # API URL (default: https://isolated.tech)
```

## License

MIT
