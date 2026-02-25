/**
 * GET /api/admin/codes - List all discount codes
 * POST /api/admin/codes - Create a new discount code
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession } from "@/lib/auth";
import { nanoid } from "@/lib/db";

async function requireAdmin(request: NextRequest, env: Env) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) {
    return null;
  }

  const { user } = await validateSession(sessionId, env);

  if (!user || !user.isAdmin) {
    return null;
  }

  return user;
}

export async function GET(request: NextRequest) {
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

    const { results } = await env.DB.prepare(
      `SELECT dc.*, a.name as app_name
       FROM discount_codes dc
       LEFT JOIN apps a ON dc.app_id = a.id
       ORDER BY dc.created_at DESC`
    ).all<{
      id: string;
      code: string;
      discount_type: string;
      discount_value: number;
      app_id: string | null;
      app_name: string | null;
      max_uses: number | null;
      times_used: number;
      expires_at: string | null;
      is_active: number;
      created_at: string;
    }>();

    return NextResponse.json({ codes: results });
  } catch (error) {
    console.error("List codes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch codes" },
      { status: 500 }
    );
  }
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
    const {
      code,
      discount_type,
      discount_value,
      app_id,
      max_uses,
      expires_at,
      is_active,
    } = body;

    // Validate
    if (!code || typeof code !== "string" || code.length < 2) {
      return NextResponse.json(
        { error: "Code must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!["percent", "fixed"].includes(discount_type)) {
      return NextResponse.json(
        { error: "Invalid discount type" },
        { status: 400 }
      );
    }

    if (
      typeof discount_value !== "number" ||
      discount_value <= 0 ||
      (discount_type === "percent" && discount_value > 100)
    ) {
      return NextResponse.json(
        { error: "Invalid discount value" },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await env.DB.prepare(
      `SELECT id FROM discount_codes WHERE code = ?`
    )
      .bind(code.toUpperCase())
      .first<{ id: string }>();

    if (existing) {
      return NextResponse.json(
        { error: "Code already exists" },
        { status: 400 }
      );
    }

    // Create code
    const codeId = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO discount_codes (id, code, discount_type, discount_value, app_id, max_uses, times_used, expires_at, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
    )
      .bind(
        codeId,
        code.toUpperCase(),
        discount_type,
        discount_value,
        app_id || null,
        max_uses || null,
        expires_at || null,
        is_active ? 1 : 0,
        now
      )
      .run();

    return NextResponse.json({
      success: true,
      code: {
        id: codeId,
        code: code.toUpperCase(),
        discount_type,
        discount_value,
      },
    });
  } catch (error) {
    console.error("Create code error:", error);
    return NextResponse.json(
      { error: "Failed to create code" },
      { status: 500 }
    );
  }
}
