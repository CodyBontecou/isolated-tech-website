# Admin Guide

This guide covers common administrative tasks for the ISOLATED.TECH App Store.

## Accessing the Admin Panel

Navigate to `/admin` while logged in with an admin account. The admin panel includes:

- **Dashboard** — Overview stats and recent activity
- **Apps** — Manage app catalog
- **Discount Codes** — Create and manage promotional codes
- **Purchases** — View and manage customer purchases
- **Users** — View registered users
- **Broadcast** — Send emails to users

## Adding a New App

1. Go to **Admin → Apps → New App**
2. Fill in the required fields:
   - **Name** — Display name of your app
   - **Slug** — URL-safe identifier (auto-generated from name)
   - **Tagline** — Short description shown in listings
   - **Description** — Full description (supports markdown)
   - **Platforms** — Check iOS and/or macOS
   - **Pricing** — Set minimum and suggested prices
3. Click **Create App**
4. The app will be in draft mode until you toggle **Published**

## Uploading a New Version

1. Go to **Admin → Apps → [Your App] → Versions**
2. Click **Upload New Version**
3. Fill in version details:
   - **Version** — Semantic version (e.g., 1.2.0)
   - **Build Number** — Integer build number
   - **Min OS Version** — Minimum required OS version
   - **Release Notes** — Changelog for this version (markdown)
   - **File** — Upload the .zip or .dmg file
4. The file uploads to R2 storage
5. Toggle **Latest** to make this the current download

## Creating Discount Codes

1. Go to **Admin → Discount Codes → New Code**
2. Configure the code:
   - **Code** — Enter custom code or click Generate
   - **Type** — Percentage or Fixed amount
   - **Value** — Discount amount
   - **App** — Restrict to specific app (optional)
   - **Max Uses** — Limit total redemptions (optional)
   - **Expires** — Set expiration date (optional)
3. Toggle **Active** to enable the code
4. Share the code with customers

### Code Tips

- Use memorable codes for campaigns (e.g., `LAUNCH50`)
- Set max uses for limited promotions
- Create app-specific codes for targeted discounts
- 100% discount codes = free copies

## Processing Refunds

1. Go to **Admin → Purchases**
2. Find the purchase to refund
3. Click **Refund** button
4. Confirm the refund

**Note:** Refunds are processed through Stripe. The customer loses access to downloads after refund.

## Sending Broadcasts

1. Go to **Admin → Broadcast**
2. Select your audience:
   - **Newsletter Subscribers** — Users who opted in
   - **App Purchasers** — Buyers of a specific app
   - **All Users** — Everyone registered
3. Compose your email:
   - **Subject** — Email subject line
   - **Body** — Message content (supports markdown)
4. Click **Show Preview** to review
5. Click **Send Test Email** to verify formatting
6. Click **Send** to broadcast to all recipients

### Broadcast Best Practices

- Always send a test email first
- Keep subject lines under 50 characters
- Include unsubscribe info in footer
- Don't broadcast too frequently
