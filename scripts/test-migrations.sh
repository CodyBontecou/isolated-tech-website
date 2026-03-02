#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/migrations"
TMP_DB="$(mktemp /tmp/isolated-migrations-XXXXXX.db)"

cleanup() {
  rm -f "$TMP_DB"
}
trap cleanup EXIT

echo "[migrations] Using temp DB: $TMP_DB"

# Apply all migrations in order
for migration in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  echo "[migrations] Applying $(basename "$migration")"
  sqlite3 "$TMP_DB" < "$migration"
done

echo "[migrations] Verifying marketplace columns/tables..."

# Helper: assert SQL returns at least 1 row
assert_exists() {
  local sql="$1"
  local label="$2"
  local result
  result=$(sqlite3 "$TMP_DB" "$sql")
  if [[ -z "$result" || "$result" == "0" ]]; then
    echo "❌ Migration check failed: $label"
    exit 1
  fi
  echo "✅ $label"
}

# 0024 checks
assert_exists "SELECT COUNT(*) FROM pragma_table_info('user') WHERE name='stripe_account_id';" "user.stripe_account_id exists"
assert_exists "SELECT COUNT(*) FROM pragma_table_info('user') WHERE name='stripe_onboarded';" "user.stripe_onboarded exists"
assert_exists "SELECT COUNT(*) FROM pragma_table_info('user') WHERE name='is_seller';" "user.is_seller exists"
assert_exists "SELECT COUNT(*) FROM pragma_table_info('apps') WHERE name='owner_id';" "apps.owner_id exists"
assert_exists "SELECT COUNT(*) FROM pragma_table_info('purchases') WHERE name='platform_fee_cents';" "purchases.platform_fee_cents exists"
assert_exists "SELECT COUNT(*) FROM pragma_table_info('purchases') WHERE name='seller_amount_cents';" "purchases.seller_amount_cents exists"
assert_exists "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='seller_notifications';" "seller_notifications table exists"
assert_exists "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='seller_payouts';" "seller_payouts table exists"

# 0025 checks
assert_exists "SELECT COUNT(*) FROM pragma_table_info('api_keys') WHERE name='user_id';" "api_keys.user_id exists"

# Sanity data checks for new schema
sqlite3 "$TMP_DB" <<'SQL'
INSERT INTO user (id, name, email, "emailVerified") VALUES ('u_seller', 'Seller User', 'seller@example.com', 1);
INSERT INTO user (id, name, email, "emailVerified") VALUES ('u_buyer', 'Buyer User', 'buyer@example.com', 1);

INSERT INTO apps (id, slug, name, platforms, is_published, owner_id)
VALUES ('app_1', 'test-app', 'Test App', '["macos"]', 1, 'u_seller');

INSERT INTO purchases (id, user_id, app_id, amount_cents, platform_fee_cents, seller_amount_cents, status)
VALUES ('purchase_1', 'u_buyer', 'app_1', 1000, 150, 850, 'completed');

INSERT INTO api_keys (id, name, key_hash, key_prefix, expires_at, user_id)
VALUES ('key_1', 'cli', 'hash_1', 'prefix_1', datetime('now', '+30 days'), 'u_seller');
SQL

assert_exists "SELECT COUNT(*) FROM purchases WHERE platform_fee_cents = 150 AND seller_amount_cents = 850;" "purchases accepts platform/seller fee data"
assert_exists "SELECT COUNT(*) FROM api_keys WHERE user_id = 'u_seller';" "api_keys accepts user-scoped keys"
assert_exists "SELECT COUNT(*) FROM apps WHERE owner_id = 'u_seller';" "apps accepts owner_id"

echo ""
echo "✅ Migration smoke test passed (0001 -> 0025)"
