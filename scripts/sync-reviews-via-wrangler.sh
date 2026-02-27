#!/bin/bash
# Sync App Store reviews using wrangler for D1 access
# This script fetches reviews via App Store Connect API and inserts them via wrangler d1

set -e

cd "$(dirname "$0")/.."

# Load env
source .env.local

# Check required vars
if [ -z "$APP_STORE_CONNECT_KEY_ID" ] || [ -z "$APP_STORE_CONNECT_ISSUER_ID" ]; then
  echo "❌ Missing APP_STORE_CONNECT_KEY_ID or APP_STORE_CONNECT_ISSUER_ID"
  exit 1
fi

KEY_FILE="$HOME/.appstoreconnect/private_keys/AuthKey_${APP_STORE_CONNECT_KEY_ID}.p8"
if [ ! -f "$KEY_FILE" ]; then
  echo "❌ Key file not found: $KEY_FILE"
  exit 1
fi

echo "🍎 App Store Reviews Sync"
echo ""

# Run the TypeScript sync script
npx tsx scripts/sync-app-store-reviews.ts
