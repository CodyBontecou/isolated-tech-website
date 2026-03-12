# GitHub Actions Workflows

## release-macos.yml

Reusable workflow for building, notarizing, and publishing macOS apps to isolated.tech.

### Usage

Call from your repository:

```yaml
name: Release macOS

on:
  release:
    types: [published]

jobs:
  release:
    uses: CodyBontecou/isolated-tech-website/.github/workflows/release-macos.yml@main
    with:
      xcode-scheme: MyApp-macOS
      app-name: MyApp
      isolated-slug: myapp
    secrets: inherit
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `xcode-scheme` | ✓ | - | Xcode scheme to build |
| `app-name` | ✓ | - | Name of .app bundle (e.g., `MyApp` for `MyApp.app`) |
| `isolated-slug` | ✓ | - | App slug on isolated.tech |
| `xcode-version` | | `latest-stable` | Xcode version |
| `working-directory` | | `.` | Directory with Xcode project |
| `dry-run` | | `false` | Build without publishing |

### Required Secrets

| Secret | Description |
|--------|-------------|
| `ISOLATED_API_KEY` | API key from isolated.tech |
| `SPARKLE_ED_PRIVATE_KEY` | Base64-encoded EdDSA private key |
| `APPLE_CERTIFICATE_P12` | Base64-encoded Developer ID .p12 |
| `APPLE_CERTIFICATE_PASSWORD` | Password for .p12 |
| `APPLE_ID` | Apple ID email |
| `APPLE_ID_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

### What It Does

1. **Build** - Archives macOS app with Xcode
2. **Sign** - Uses Developer ID certificate
3. **Notarize** - Submits to Apple and staples ticket
4. **Publish** - Pushes to isolated.tech (Sparkle auto-updates)
5. **Attach** - Adds zip to GitHub release

### Getting Secrets

See the [isolated CLI README](../../cli/README.md) for authentication setup.

**SPARKLE_ED_PRIVATE_KEY:**
```bash
security find-generic-password -s "Sparkle EdDSA Key" -w | base64
```

**APPLE_CERTIFICATE_P12:**
```bash
# Export Developer ID Application cert from Keychain as .p12
base64 -i ~/Downloads/Certificates.p12 | pbcopy
```

**APPLE_ID_PASSWORD:**
Create at [appleid.apple.com](https://appleid.apple.com/account/manage) → Security → App-Specific Passwords
