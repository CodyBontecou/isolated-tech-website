import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, generateApiKey, revokeApiKey } from "@/lib/admin-auth";
import { query } from "@/lib/db";

/**
 * GET /api/admin/api-keys
 * List API keys (scoped to current user unless superuser)
 */
export async function GET(request: NextRequest) {
  const env = getEnv();
  const admin = await requireAdmin(request, env);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await query<{
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    expires_at: string;
    last_used_at: string | null;
    is_revoked: number;
    user_id: string | null;
    owner_email: string | null;
  }>(
    admin.isSuperuser
      ? `SELECT k.id, k.name, k.key_prefix, k.created_at, k.expires_at, k.last_used_at, k.is_revoked, k.user_id, u.email as owner_email
         FROM api_keys k
         LEFT JOIN user u ON k.user_id = u.id
         ORDER BY k.created_at DESC`
      : `SELECT k.id, k.name, k.key_prefix, k.created_at, k.expires_at, k.last_used_at, k.is_revoked, k.user_id, u.email as owner_email
         FROM api_keys k
         LEFT JOIN user u ON k.user_id = u.id
         WHERE k.user_id = ?
         ORDER BY k.created_at DESC`,
    admin.isSuperuser ? [] : [admin.id],
    env
  );

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key_prefix,
      createdAt: k.created_at,
      expiresAt: k.expires_at,
      lastUsedAt: k.last_used_at,
      isRevoked: k.is_revoked === 1,
      isExpired: new Date(k.expires_at) < new Date(),
      userId: k.user_id,
      ownerEmail: k.owner_email,
    })),
  });
}

/**
 * POST /api/admin/api-keys
 * Generate a new API key with 30-day expiration, owned by current user
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    const admin = await requireAdmin(request, env);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = body.name || "default";

    // Superusers may optionally create keys for another user
    const targetUserId = admin.isSuperuser && body.userId ? body.userId : admin.id;

    const { key, expiresAt } = await generateApiKey(env, name, targetUserId);

    return NextResponse.json({
      key, // Only returned once at creation time
      expiresAt: expiresAt.toISOString(),
      message: "Save this key securely - it won't be shown again!",
    });
  } catch (error) {
    console.error("API key generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/api-keys
 * Revoke an API key by its prefix
 */
export async function DELETE(request: NextRequest) {
  const env = getEnv();
  const admin = await requireAdmin(request, env);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const keyPrefix = body.keyPrefix;

  if (!keyPrefix) {
    return NextResponse.json(
      { error: "keyPrefix is required" },
      { status: 400 }
    );
  }

  const revoked = await revokeApiKey(env, keyPrefix, {
    isSuperuser: admin.isSuperuser,
    userId: admin.id,
  });

  if (!revoked) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
