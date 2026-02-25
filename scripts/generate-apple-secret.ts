#!/usr/bin/env npx tsx
/**
 * Generate Apple Sign In client secret JWT
 *
 * Apple requires a JWT signed with your private key as the client_secret.
 * This JWT is valid for up to 6 months.
 *
 * Usage: npx tsx scripts/generate-apple-secret.ts
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Apple credentials from App Store Connect
const TEAM_ID = "67KC823C9A";
const KEY_ID = "27W9MMWNCC";
const CLIENT_ID = "tech.isolated.web"; // Services ID

// Path to private key
const PRIVATE_KEY_PATH =
  process.argv[2] || `${process.env.HOME}/.apple-keys/AuthKey_27W9MMWNCC.p8`;

function base64url(data: Buffer | string): string {
  const base64 =
    typeof data === "string"
      ? Buffer.from(data).toString("base64")
      : data.toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateAppleClientSecret(): string {
  // Read private key
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");

  // JWT Header
  const header = {
    alg: "ES256",
    kid: KEY_ID,
    typ: "JWT",
  };

  // JWT Payload - 6 months expiration (maximum allowed by Apple)
  const now = Math.floor(Date.now() / 1000);
  const sixMonthsInSeconds = 15777000; // ~6 months

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + sixMonthsInSeconds,
    aud: "https://appleid.apple.com",
    sub: CLIENT_ID,
  };

  // Create signing input
  const headerBase64 = base64url(JSON.stringify(header));
  const payloadBase64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerBase64}.${payloadBase64}`;

  // Sign with ES256
  const sign = crypto.createSign("SHA256");
  sign.update(signingInput);
  const signature = sign.sign(
    {
      key: privateKey,
      dsaEncoding: "ieee-p1363", // Apple requires raw signature format
    },
    "base64"
  );

  // Convert to base64url
  const signatureBase64url = signature
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${signatureBase64url}`;
}

// Generate and output
const clientSecret = generateAppleClientSecret();

console.log("=== Apple Sign In Configuration ===\n");
console.log("Client ID:", CLIENT_ID);
console.log("Team ID:", TEAM_ID);
console.log("Key ID:", KEY_ID);
console.log("\nGenerated Client Secret (JWT):\n");
console.log(clientSecret);
console.log("\n=== Wrangler Commands ===\n");
console.log("Run these commands to set the secrets:\n");
console.log(`echo "${CLIENT_ID}" | npx wrangler secret put APPLE_CLIENT_ID`);
console.log(`echo "${clientSecret}" | npx wrangler secret put APPLE_CLIENT_SECRET`);
console.log("\n=== Expiration ===\n");
const expDate = new Date(Date.now() + 15777000 * 1000);
console.log(`This secret expires: ${expDate.toISOString()}`);
console.log(
  "Set a reminder to regenerate before then!"
);
