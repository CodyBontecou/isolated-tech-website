/**
 * POST /api/admin/subscribers/import
 *
 * Import email subscribers from Gumroad or other sources
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid } from "@/lib/db";

interface EmailEntry {
  email: string;
  name: string | null;
}

function parseEmails(input: string): EmailEntry[] {
  const entries: EmailEntry[] = [];
  const lines = input.split(/[\n\r]+/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle CSV format: email,name or "email","name"
    const parts = trimmed.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const email = parts[0]?.toLowerCase();
    const name = parts[1] || null;

    if (email && email.includes("@") && email.includes(".")) {
      entries.push({ email, name });
    }
  }

  // Deduplicate by email
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.email)) return false;
    seen.add(e.email);
    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { emails, source, productName, createLegacyPurchases } = body;

    if (!emails || typeof emails !== "string") {
      return NextResponse.json(
        { error: "No emails provided" },
        { status: 400 }
      );
    }

    const entries = parseEmails(emails);
    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses found" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Check for existing users to auto-link
    const existingUsers = await env.DB.prepare(
      `SELECT id, email FROM "user"`
    ).all<{ id: string; email: string }>();

    const userByEmail = new Map(
      existingUsers.results.map((u) => [u.email.toLowerCase(), u.id])
    );

    for (const entry of entries) {
      try {
        const userId = userByEmail.get(entry.email) || null;
        const subscriberId = nanoid();
        const metadata = JSON.stringify({
          product: productName || null,
          importedAt: new Date().toISOString(),
        });

        // Insert subscriber (or ignore if exists)
        const subResult = await env.DB.prepare(
          `INSERT INTO subscribers (id, email, name, source, user_id, metadata)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
             name = COALESCE(excluded.name, subscribers.name),
             user_id = COALESCE(excluded.user_id, subscribers.user_id)`
        )
          .bind(subscriberId, entry.email, entry.name, source || "import", userId, metadata)
          .run();

        // Create legacy purchase if requested
        if (createLegacyPurchases && productName) {
          const purchaseId = nanoid();
          const claimedAt = userId ? new Date().toISOString() : null;

          await env.DB.prepare(
            `INSERT INTO legacy_purchases (id, email, product_name, user_id, claimed_at, source)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT DO NOTHING`
          )
            .bind(purchaseId, entry.email, productName, userId, claimedAt, source || "gumroad")
            .run();
        }

        if (subResult.meta.changes > 0) {
          imported++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Error importing ${entry.email}:`, err);
        errors.push(`Failed to import ${entry.email}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("Import subscribers error:", error);
    return NextResponse.json(
      { 
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Failed to import subscribers"]
      },
      { status: 500 }
    );
  }
}
