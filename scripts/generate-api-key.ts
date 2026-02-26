#!/usr/bin/env npx tsx
/**
 * Generate a new ISOLATED_API_KEY with 30-day expiration
 *
 * Usage:
 *   npx tsx scripts/generate-api-key.ts [name]
 *
 * Requires an existing valid API key in ISOLATED_API_KEY env var,
 * or use the static ADMIN_API_KEY for bootstrapping.
 */

const API_BASE = process.env.API_BASE || "https://isolated.tech";
const API_KEY = process.env.ISOLATED_API_KEY || process.env.ADMIN_API_KEY;

async function main() {
  const name = process.argv[2] || "cli-generated";

  if (!API_KEY) {
    console.error("Error: ISOLATED_API_KEY or ADMIN_API_KEY env var required");
    process.exit(1);
  }

  console.log(`Generating new API key with name: ${name}`);
  console.log(`Using API: ${API_BASE}`);

  const response = await fetch(`${API_BASE}/api/admin/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status} - ${error}`);
    process.exit(1);
  }

  const result = await response.json();

  console.log("\n✅ New API key generated!\n");
  console.log("=".repeat(60));
  console.log(`Key:        ${result.key}`);
  console.log(`Expires:    ${result.expiresAt}`);
  console.log("=".repeat(60));
  console.log("\n⚠️  Save this key securely - it won't be shown again!\n");
  console.log("Set it in your environment:");
  console.log(`  export ISOLATED_API_KEY="${result.key}"`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
