#!/usr/bin/env npx tsx
/**
 * Import Gumroad emails as subscribers and legacy purchases
 * 
 * Usage: npx tsx scripts/import-gumroad.ts
 * 
 * For CSV import: npx tsx scripts/import-gumroad.ts path/to/export.csv
 */

// Gumroad emails from screenshot - deduplicated
const GUMROAD_EMAILS = [
  { email: "justin@justinseal.com", name: null },
  { email: "pedrohenriquedsmelo@gmail.com", name: null },
  { email: "kheir_eddine@me.com", name: null },
  { email: "mjannink@hotmail.com", name: null },
  { email: "alistairjlee@gmail.com", name: null },
  { email: "oncemade@gmail.com", name: null },
  { email: "wes@wesbaker.com", name: null },
  { email: "boynep@gmail.com", name: null },
  { email: "hostel-hydride.3n@icloud.com", name: null },
  { email: "jbasore@gmail.com", name: "James Basore" },
  { email: "cloves.denim0a@icloud.com", name: null },
  { email: "bontecouc@gmail.com", name: null },
];

// Product mapping - update this based on what you sold on Gumroad
const GUMROAD_PRODUCT = "Ikigai"; // Default product name

async function importEmails() {
  console.log("🔄 Importing Gumroad emails...\n");

  // Check for CSV argument
  const csvPath = process.argv[2];
  let emails = GUMROAD_EMAILS;

  if (csvPath) {
    console.log(`📄 Reading from CSV: ${csvPath}`);
    const fs = await import("fs");
    const csv = fs.readFileSync(csvPath, "utf-8");
    const lines = csv.split("\n").slice(1); // Skip header
    
    emails = lines
      .filter(line => line.trim())
      .map(line => {
        const [email, name] = line.split(",").map(s => s.trim().replace(/"/g, ""));
        return { email: email.toLowerCase(), name: name || null };
      })
      .filter(e => e.email && e.email.includes("@"));
  }

  // Deduplicate by email
  const seen = new Set<string>();
  const unique = emails.filter(e => {
    const lower = e.email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  console.log(`📧 Found ${unique.length} unique emails\n`);

  // Generate SQL for import
  const nanoid = () => {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let id = "";
    const bytes = new Uint8Array(21);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 21; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  };

  console.log("-- SQL to run in D1:\n");
  console.log("-- First, run the migration:");
  console.log("-- npx wrangler d1 execute isolated-db --local --file=migrations/0017_email_subscribers.sql");
  console.log("-- npx wrangler d1 execute isolated-db --remote --file=migrations/0017_email_subscribers.sql\n");
  
  console.log("-- Then import subscribers:\n");

  for (const { email, name } of unique) {
    const subId = nanoid();
    const legacyId = nanoid();
    const escapedEmail = email.replace(/'/g, "''");
    const escapedName = name ? `'${name.replace(/'/g, "''")}'` : "NULL";

    // Insert subscriber
    console.log(`INSERT OR IGNORE INTO subscribers (id, email, name, source, metadata) VALUES ('${subId}', '${escapedEmail}', ${escapedName}, 'gumroad', '{"product": "${GUMROAD_PRODUCT}"}');`);
    
    // Insert legacy purchase
    console.log(`INSERT OR IGNORE INTO legacy_purchases (id, email, product_name, source) VALUES ('${legacyId}', '${escapedEmail}', '${GUMROAD_PRODUCT}', 'gumroad');`);
  }

  console.log("\n✅ Copy the SQL above and run it, or use the admin import UI\n");

  // Also output JSON for API import
  console.log("-- Or use this JSON for API import:\n");
  console.log(JSON.stringify(unique.map(e => ({
    email: e.email,
    name: e.name,
    source: "gumroad",
    product: GUMROAD_PRODUCT,
  })), null, 2));
}

importEmails();
