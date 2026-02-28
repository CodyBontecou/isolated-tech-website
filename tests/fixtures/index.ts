/**
 * Test fixtures - sample data for tests
 */

// ============================================================================
// Users
// ============================================================================

export const testUser = {
  id: "user_test_123",
  email: "test@example.com",
  name: "Test User",
  image: null,
  emailVerified: true,
  createdAt: new Date("2024-01-01").toISOString(),
  updatedAt: new Date("2024-01-01").toISOString(),
};

export const adminUser = {
  ...testUser,
  id: "user_admin_123",
  email: "admin@isolated.tech",
  name: "Admin User",
  isAdmin: true,
};

// ============================================================================
// Apps
// ============================================================================

export const testApp = {
  id: "app_test_123",
  name: "Test App",
  slug: "test-app",
  tagline: "A test application",
  description: "This is a test application for testing purposes.",
  icon_url: "/icons/test-app.png",
  min_price_cents: 999,
  is_published: 1,
  created_at: new Date("2024-01-01").toISOString(),
  updated_at: new Date("2024-01-01").toISOString(),
};

export const freeApp = {
  ...testApp,
  id: "app_free_123",
  name: "Free App",
  slug: "free-app",
  min_price_cents: 0,
};

// ============================================================================
// App Versions
// ============================================================================

export const testVersion = {
  id: "version_test_123",
  app_id: testApp.id,
  version: "1.0.0",
  r2_key: "apps/test-app/test-app-1.0.0.zip",
  file_size_bytes: 1024 * 1024, // 1MB
  release_notes: "Initial release",
  is_latest: 1,
  created_at: new Date("2024-01-01").toISOString(),
};

// ============================================================================
// Purchases
// ============================================================================

export const testPurchase = {
  id: "purchase_test_123",
  user_id: testUser.id,
  app_id: testApp.id,
  stripe_payment_intent_id: "pi_test_123",
  stripe_checkout_session_id: "cs_test_123",
  amount_cents: 999,
  discount_code_id: null,
  status: "completed",
  created_at: new Date("2024-01-01").toISOString(),
};

export const refundedPurchase = {
  id: "purchase_refunded_123",
  user_id: testUser.id,
  app_id: testApp.id,
  stripe_payment_intent_id: "pi_refunded_123",
  stripe_checkout_session_id: "cs_refunded_123",
  amount_cents: 999,
  discount_code_id: null,
  status: "refunded",
  created_at: new Date("2024-01-01").toISOString(),
  refunded_at: new Date("2024-01-15").toISOString(),
};

export const freePurchase = {
  id: "purchase_free_123",
  user_id: testUser.id,
  app_id: freeApp.id,
  stripe_payment_intent_id: null,
  stripe_checkout_session_id: null,
  amount_cents: 0,
  discount_code_id: null,
  status: "completed",
  created_at: new Date("2024-01-01").toISOString(),
};

// ============================================================================
// Discount Codes
// ============================================================================

export const percentDiscountCode = {
  id: "code_percent_123",
  code: "SAVE50",
  discount_type: "percent",
  discount_value: 50,
  app_id: null, // applies to all apps
  max_uses: 100,
  times_used: 0,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  is_active: 1,
  created_at: new Date("2024-01-01").toISOString(),
};

export const fixedDiscountCode = {
  id: "code_fixed_123",
  code: "TAKE5",
  discount_type: "fixed",
  discount_value: 500, // $5.00
  app_id: testApp.id,
  max_uses: 50,
  times_used: 0,
  expires_at: null,
  is_active: 1,
  created_at: new Date("2024-01-01").toISOString(),
};

export const expiredDiscountCode = {
  ...percentDiscountCode,
  id: "code_expired_123",
  code: "EXPIRED",
  expires_at: new Date("2023-01-01").toISOString(),
};

export const maxedOutDiscountCode = {
  ...percentDiscountCode,
  id: "code_maxed_123",
  code: "MAXED",
  max_uses: 10,
  times_used: 10,
};

// ============================================================================
// API Keys (for admin auth)
// ============================================================================

// Pre-computed SHA-256 hash of "valid_api_key_0123456789abcdef0123456789abcdef0123456789abcdef01234567"
// This allows testing key validation without exposing the hashing function
export const validApiKeyRaw = "valid_api_key_0123456789abcdef0123456789abcdef0123456789abcdef01234567";
export const validApiKeyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Will be computed in test setup

export const validApiKey = {
  id: "apikey_valid_123",
  name: "Test API Key",
  key_hash: "", // Will be set during test setup
  key_prefix: "valid_ap",
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  is_revoked: 0,
  last_used_at: null,
  created_at: new Date("2024-01-01").toISOString(),
};

export const expiredApiKey = {
  id: "apikey_expired_123",
  name: "Expired API Key",
  key_hash: "", // Will be set during test setup
  key_prefix: "expired_",
  expires_at: new Date("2023-01-01").toISOString(), // Already expired
  is_revoked: 0,
  last_used_at: null,
  created_at: new Date("2022-12-01").toISOString(),
};

export const revokedApiKey = {
  id: "apikey_revoked_123",
  name: "Revoked API Key",
  key_hash: "", // Will be set during test setup
  key_prefix: "revoked_",
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_revoked: 1,
  last_used_at: null,
  created_at: new Date("2024-01-01").toISOString(),
};

// ============================================================================
// Download Tokens
// ============================================================================

export const validDownloadToken = {
  id: "token_test_123",
  token: "valid_download_token_abcdefghij",
  user_id: testUser.id,
  app_id: testApp.id,
  purchase_id: testPurchase.id,
  used_at: null,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  created_at: new Date().toISOString(),
};

export const usedDownloadToken = {
  ...validDownloadToken,
  id: "token_used_123",
  token: "used_download_token_abcdefghij",
  used_at: new Date().toISOString(),
};

export const expiredDownloadToken = {
  ...validDownloadToken,
  id: "token_expired_123",
  token: "expired_download_token_abcdef",
  expires_at: new Date("2023-01-01").toISOString(),
};

// ============================================================================
// Helper to create D1 state from fixtures
// ============================================================================

export function createTestD1State() {
  return {
    tables: new Map([
      ["user", [testUser, adminUser]],
      ["apps", [testApp, freeApp]],
      ["app_versions", [testVersion]],
      ["purchases", [testPurchase, refundedPurchase, freePurchase]],
      ["discount_codes", [
        percentDiscountCode,
        fixedDiscountCode,
        expiredDiscountCode,
        maxedOutDiscountCode,
      ]],
      ["download_tokens", [
        validDownloadToken,
        usedDownloadToken,
        expiredDownloadToken,
      ]],
      ["downloads", []],
      ["email_log", []],
      ["api_keys", [
        validApiKey,
        expiredApiKey,
        revokedApiKey,
      ]],
    ]),
  };
}

// ============================================================================
// Helper to create R2 state from fixtures
// ============================================================================

export function createTestR2State() {
  const encoder = new TextEncoder();
  return {
    objects: new Map([
      [
        testVersion.r2_key,
        {
          body: encoder.encode("mock zip file contents"),
          metadata: { contentType: "application/zip" },
        },
      ],
    ]),
  };
}
