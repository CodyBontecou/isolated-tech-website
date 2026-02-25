# Sparkle Integration Guide

This guide explains how to integrate Sparkle for automatic updates in your macOS apps distributed through ISOLATED.TECH.

## Overview

[Sparkle](https://sparkle-project.org/) is the standard framework for self-updating macOS apps. Our store provides:

- Appcast XML feeds at `/appcast/[slug].xml`
- Secure downloads via authenticated URLs
- Version history and release notes

## Step 1: Add Sparkle to Your App

### Using Swift Package Manager

Add Sparkle to your Xcode project:

1. File → Add Packages
2. Enter: `https://github.com/sparkle-project/Sparkle`
3. Select version 2.x

### Using CocoaPods

```ruby
pod 'Sparkle', '~> 2.0'
```

## Step 2: Configure Info.plist

Add these keys to your app's `Info.plist`:

```xml
<!-- Appcast URL -->
<key>SUFeedURL</key>
<string>https://isolated.tech/appcast/YOUR_APP_SLUG.xml</string>

<!-- Enable automatic updates -->
<key>SUEnableAutomaticChecks</key>
<true/>

<!-- Public EdDSA key (required for Sparkle 2.x) -->
<key>SUPublicEDKey</key>
<string>YOUR_BASE64_PUBLIC_KEY</string>
```

Replace `YOUR_APP_SLUG` with your app's slug (e.g., `voxboard`).

## Step 3: Generate EdDSA Keys

Sparkle 2.x requires EdDSA signatures. Generate a key pair:

```bash
# Using Sparkle's generate_keys tool
./bin/generate_keys

# Or manually with OpenSSL
openssl genpkey -algorithm Ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
```

Keep your **private key** secure — you'll need it to sign updates.

Extract the public key for Info.plist:

```bash
# Get base64 public key
cat public.pem | grep -v "^-" | tr -d '\n'
```

## Step 4: Sign Your Updates

When uploading a new version, sign the archive:

```bash
# Using Sparkle's sign_update tool
./bin/sign_update YOUR_APP.zip

# Output: sparkle:edSignature="base64_signature" length="file_size"
```

Enter this signature when uploading the version to our admin panel.

## Step 5: Initialize Sparkle in Your App

### SwiftUI

```swift
import Sparkle

@main
struct MyApp: App {
    private let updaterController: SPUStandardUpdaterController

    init() {
        updaterController = SPUStandardUpdaterController(
            startingUpdater: true,
            updaterDelegate: nil,
            userDriverDelegate: nil
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            CommandGroup(after: .appInfo) {
                CheckForUpdatesView(updater: updaterController.updater)
            }
        }
    }
}
```

### AppKit

```swift
import Sparkle

class AppDelegate: NSObject, NSApplicationDelegate {
    let updaterController = SPUStandardUpdaterController(
        startingUpdater: true,
        updaterDelegate: nil,
        userDriverDelegate: nil
    )
}
```

## Appcast Format

Our appcast feeds follow the Sparkle 2.x format:

```xml
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>Your App</title>
    <link>https://isolated.tech/apps/your-app</link>
    <item>
      <title>Version 1.2.0</title>
      <sparkle:version>42</sparkle:version>
      <sparkle:shortVersionString>1.2.0</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>14.0</sparkle:minimumSystemVersion>
      <pubDate>Mon, 24 Feb 2026 12:00:00 +0000</pubDate>
      <sparkle:releaseNotesLink>
        https://isolated.tech/apps/your-app/changelog#1.2.0
      </sparkle:releaseNotesLink>
      <enclosure
        url="https://..."
        sparkle:edSignature="base64_signature"
        length="5242880"
        type="application/octet-stream"
      />
    </item>
  </channel>
</rss>
```

## Testing Updates

1. Build your app with a lower version number
2. Upload a new version to the store
3. Launch your test build
4. Sparkle should detect and offer the update

### Debug Mode

Enable Sparkle debug logging:

```swift
updater.debugLogging = true
```

## Troubleshooting

### "No update available" when there should be

- Check that `CFBundleVersion` (build number) is lower than the server version
- Verify the appcast URL is accessible
- Check Sparkle debug logs

### Signature verification failed

- Ensure the public key in Info.plist matches your signing key
- Verify the signature was generated with the correct private key
- Check that the file hasn't been modified after signing

### Download fails

- The user must have purchased the app to download
- Check that the download URL in appcast is correct
- Verify R2 bucket permissions

## CLI Upload

For automated releases, use the admin API with an API key:

```bash
# Set your API key
export ISOLATED_API_KEY="your-admin-api-key"

# Upload a new version
curl -X POST https://isolated.tech/api/admin/versions/presign \
  -H "X-API-Key: $ISOLATED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"appId":"...","appSlug":"your-app","version":"1.2.0","filename":"YourApp.zip"}'

# Upload file
curl -X POST https://isolated.tech/api/admin/versions/upload \
  -H "X-API-Key: $ISOLATED_API_KEY" \
  -F "file=@YourApp.zip" \
  -F "r2Key=apps/your-app/versions/1.2.0/YourApp.zip"

# Create version record
curl -X POST https://isolated.tech/api/admin/versions \
  -H "X-API-Key: $ISOLATED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"appId":"...","version":"1.2.0","buildNumber":42,...}'
```

Or use the `sparkle-release` pi skill which automates this entire flow.

## Security Notes

- Never commit your private signing key
- Store the private key securely (1Password, etc.)
- The public key can be committed to your repo
- Downloads require authentication via session cookie
- API keys are for admin CLI access only — keep them secure
