/**
 * PUT /api/admin/codes/[id] - Update a discount code
 * DELETE /api/admin/codes/[id] - Delete a discount code
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession } from "@/lib/auth";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if code exists
    const existing = await env.DB.prepare(
      `SELECT id, code FROM discount_codes WHERE id = ?`
    )
      .bind(params.id)
      .first<{ id: string; code: string }>();

    if (!existing) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
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

    // Check uniqueness if code changed
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await env.DB.prepare(
        `SELECT id FROM discount_codes WHERE code = ? AND id != ?`
      )
        .bind(code.toUpperCase(), params.id)
        .first<{ id: string }>();

      if (duplicate) {
        return NextResponse.json(
          { error: "Code already exists" },
          { status: 400 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (code !== undefined) {
      updates.push("code = ?");
      values.push(code.toUpperCase());
    }

    if (discount_type !== undefined) {
      if (!["percent", "fixed"].includes(discount_type)) {
        return NextResponse.json(
          { error: "Invalid discount type" },
          { status: 400 }
        );
      }
      updates.push("discount_type = ?");
      values.push(discount_type);
    }

    if (discount_value !== undefined) {
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
      updates.push("discount_value = ?");
      values.push(discount_value);
    }

    if (app_id !== undefined) {
      updates.push("app_id = ?");
      values.push(app_id || null);
    }

    if (max_uses !== undefined) {
      updates.push("max_uses = ?");
      values.push(max_uses || null);
    }

    if (expires_at !== undefined) {
      updates.push("expires_at = ?");
      values.push(expires_at || null);
    }

    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    values.push(params.id);

    await env.DB.prepare(
      `UPDATE discount_codes SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update code error:", error);
    return NextResponse.json(
      { error: "Failed to update code" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if code exists
    const existing = await env.DB.prepare(
      `SELECT id FROM discount_codes WHERE id = ?`
    )
      .bind(params.id)
      .first<{ id: string }>();

    if (!existing) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    // Delete code
    await env.DB.prepare(`DELETE FROM discount_codes WHERE id = ?`)
      .bind(params.id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete code error:", error);
    return NextResponse.json(
      { error: "Failed to delete code" },
      { status: 500 }
    );
  }
}
