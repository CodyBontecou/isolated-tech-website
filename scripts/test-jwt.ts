#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { join } from "path";
import crypto from "node:crypto";

const keyId = "T7KGDK4Y4V";
const issuerId = "6c3b3640-c6bf-40a9-b6e5-57cda2c7776e";
const keyPath = join(process.env.HOME || "", "dev/AuthKey_T7KGDK4Y4V.p8");
const privateKey = readFileSync(keyPath, "utf-8");

console.log("Key ID:", keyId);
console.log("Issuer ID:", issuerId);
console.log("Key file length:", privateKey.length);

// Generate JWT - matching the working implementation
const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({
    iss: issuerId,
    aud: 'appstoreconnect-v1',
    exp: Math.floor(Date.now() / 1000) + 10 * 60
  })
).toString('base64url');

const signer = crypto.createSign('sha256');
signer.update(`${header}.${payload}`);
signer.end();
const signature = signer.sign(privateKey).toString('base64url');
const token = `${header}.${payload}.${signature}`;

console.log("\nGenerated JWT (first 100 chars):", token.slice(0, 100) + "...");

// Test the token
const testUrl = "https://api.appstoreconnect.apple.com/v1/apps?limit=1";
console.log("\nTesting against:", testUrl);

fetch(testUrl, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
}).then(async (res) => {
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.slice(0, 500));
}).catch(e => console.error("Error:", e));
