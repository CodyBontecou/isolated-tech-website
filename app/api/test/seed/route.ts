/**
 * Test Data Seeding Endpoint
 * 
 * ONLY AVAILABLE IN DEVELOPMENT MODE
 * Seeds test data for E2E testing
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";

// Only allow in development/test mode
const IS_TEST_ENV = process.env.NODE_ENV !== "production";

// Test data fixtures
const TEST_APPS = [
  {
    id: "e2e_app_free",
    name: "E2E Free App",
    slug: "e2e-free-app",
    tagline: "A free app for E2E testing",
    description: "## Features\n\n- Feature 1\n- Feature 2\n- Feature 3",
    platforms: '["macos"]',
    min_price_cents: 0,
    suggested_price_cents: 0,
    is_published: 1,
    is_featured: 0,
    featured_order: 0,
  },
  {
    id: "e2e_app_paid",
    name: "E2E Paid App",
    slug: "e2e-paid-app",
    tagline: "A paid app for E2E testing",
    description: "## Premium Features\n\n- Premium Feature 1\n- Premium Feature 2",
    platforms: '["macos"]',
    min_price_cents: 999,
    suggested_price_cents: 1999,
    is_published: 1,
    is_featured: 1,
    featured_order: 1,
  },
];

const TEST_VERSIONS = [
  {
    id: "e2e_version_free",
    app_id: "e2e_app_free",
    version: "1.0.0",
    r2_key: "test/e2e-free-app-1.0.0.zip",
    file_size_bytes: 1024 * 1024,
    release_notes: "Initial E2E test release",
    is_latest: 1,
    released_at: new Date().toISOString(),
  },
  {
    id: "e2e_version_paid",
    app_id: "e2e_app_paid",
    version: "2.0.0",
    r2_key: "test/e2e-paid-app-2.0.0.zip",
    file_size_bytes: 2 * 1024 * 1024,
    release_notes: "E2E test version 2.0",
    is_latest: 1,
    released_at: new Date().toISOString(),
  },
];

const TEST_DISCOUNT_CODES = [
  {
    id: "e2e_code_percent",
    code: "E2E50OFF",
    discount_type: "percent",
    discount_value: 50,
    app_id: null,
    max_uses: 100,
    times_used: 0,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: 1,
  },
  {
    id: "e2e_code_fixed",
    code: "E2E5DOLLARS",
    discount_type: "fixed",
    discount_value: 500,
    app_id: "e2e_app_paid",
    max_uses: 50,
    times_used: 0,
    expires_at: null,
    is_active: 1,
  },
];

export async function POST(request: NextRequest): Promise<Response> {
  if (!IS_TEST_ENV) {
    return NextResponse.json(
      { error: "Test endpoints are not available in production" },
      { status: 403 }
    );
  }

  const env = getEnv();
  if (!env?.DB) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  try {
    const { type } = await request.json();

    switch (type) {
      case "apps":
        await seedApps(env.DB);
        break;
      case "codes":
        await seedDiscountCodes(env.DB);
        break;
      case "all":
        await seedApps(env.DB);
        await seedDiscountCodes(env.DB);
        break;
      case "purchase": {
        const { userId, appId } = await request.json();
        await seedPurchase(env.DB, userId, appId);
        break;
      }
      default:
        return NextResponse.json(
          { error: "Invalid seed type. Use: apps, codes, all, or purchase" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error("Test seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed test data" },
      { status: 500 }
    );
  }
}

async function seedApps(db: D1Database): Promise<void> {
  // Clean up existing test data
  await db.prepare(`DELETE FROM app_versions WHERE id LIKE 'e2e_%'`).run();
  await db.prepare(`DELETE FROM apps WHERE id LIKE 'e2e_%'`).run();

  // Insert apps
  for (const app of TEST_APPS) {
    await db.prepare(`
      INSERT OR REPLACE INTO apps (id, name, slug, tagline, description, platforms, min_price_cents, suggested_price_cents, is_published, is_featured, featured_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      app.id,
      app.name,
      app.slug,
      app.tagline,
      app.description,
      app.platforms,
      app.min_price_cents,
      app.suggested_price_cents,
      app.is_published,
      app.is_featured,
      app.featured_order
    ).run();
  }

  // Insert versions
  for (const version of TEST_VERSIONS) {
    await db.prepare(`
      INSERT OR REPLACE INTO app_versions (id, app_id, version, r2_key, file_size_bytes, release_notes, is_latest, released_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      version.id,
      version.app_id,
      version.version,
      version.r2_key,
      version.file_size_bytes,
      version.release_notes,
      version.is_latest,
      version.released_at
    ).run();
  }
}

async function seedDiscountCodes(db: D1Database): Promise<void> {
  // Clean up existing test codes
  await db.prepare(`DELETE FROM discount_codes WHERE id LIKE 'e2e_%'`).run();

  // Insert codes
  for (const code of TEST_DISCOUNT_CODES) {
    await db.prepare(`
      INSERT OR REPLACE INTO discount_codes (id, code, discount_type, discount_value, app_id, max_uses, times_used, expires_at, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      code.id,
      code.code,
      code.discount_type,
      code.discount_value,
      code.app_id,
      code.max_uses,
      code.times_used,
      code.expires_at,
      code.is_active
    ).run();
  }
}

async function seedPurchase(db: D1Database, userId: string, appId: string): Promise<void> {
  const purchaseId = `e2e_purchase_${Date.now()}`;
  
  await db.prepare(`
    INSERT INTO purchases (id, user_id, app_id, amount_cents, status, created_at)
    VALUES (?, ?, ?, 0, 'completed', datetime('now'))
  `).bind(purchaseId, userId, appId).run();
}

export async function DELETE(request: NextRequest): Promise<Response> {
  if (!IS_TEST_ENV) {
    return NextResponse.json(
      { error: "Test endpoints are not available in production" },
      { status: 403 }
    );
  }

  const env = getEnv();
  if (!env?.DB) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  try {
    // Clean up all E2E test data
    await env.DB.prepare(`DELETE FROM purchases WHERE id LIKE 'e2e_%'`).run();
    await env.DB.prepare(`DELETE FROM app_versions WHERE id LIKE 'e2e_%'`).run();
    await env.DB.prepare(`DELETE FROM apps WHERE id LIKE 'e2e_%'`).run();
    await env.DB.prepare(`DELETE FROM discount_codes WHERE id LIKE 'e2e_%'`).run();
    await env.DB.prepare(`DELETE FROM "user" WHERE id LIKE 'test_%'`).run();
    await env.DB.prepare(`DELETE FROM "session" WHERE userId LIKE 'test_%'`).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Test cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to clean up test data" },
      { status: 500 }
    );
  }
}
