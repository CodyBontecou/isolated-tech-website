import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { queryOne, execute } from "@/lib/db";
import { generateApiKey } from "@/lib/admin-auth";

interface DeviceCode {
  id: string;
  device_code: string;
  user_code: string;
  user_id: string | null;
  status: string;
  expires_at: string;
}

/**
 * POST /api/cli/auth/verify
 * 
 * Poll for device code authentication status.
 * Called repeatedly by CLI until complete or expired.
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  
  let body: { deviceCode?: string; userCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const { deviceCode, userCode } = body;
  
  if (!deviceCode || !userCode) {
    return NextResponse.json(
      { error: "deviceCode and userCode are required" },
      { status: 400 }
    );
  }
  
  // Look up the device code
  const record = await queryOne<DeviceCode>(
    `SELECT id, device_code, user_code, user_id, status, expires_at
     FROM cli_device_codes
     WHERE device_code = ? AND user_code = ?`,
    [deviceCode, userCode],
    env
  );
  
  if (!record) {
    return NextResponse.json(
      { error: "Invalid device code" },
      { status: 404 }
    );
  }
  
  // Check expiration
  const expiresAt = new Date(record.expires_at);
  if (expiresAt < new Date()) {
    // Mark as expired
    await execute(
      `UPDATE cli_device_codes SET status = 'expired' WHERE id = ?`,
      [record.id],
      env
    );
    
    return NextResponse.json({ status: "expired" });
  }
  
  // Check status
  if (record.status === "pending") {
    return NextResponse.json({ status: "pending" });
  }
  
  if (record.status === "complete" && record.user_id) {
    // Get user info
    const user = await queryOne<{
      id: string;
      email: string;
      name: string | null;
    }>(
      `SELECT id, email, name FROM user WHERE id = ?`,
      [record.user_id],
      env
    );
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 500 }
      );
    }
    
    // Generate an API key for CLI use
    const { key, expiresAt: keyExpires } = await generateApiKey(env, "cli");
    
    // Delete the device code (one-time use)
    await execute(
      `DELETE FROM cli_device_codes WHERE id = ?`,
      [record.id],
      env
    );
    
    return NextResponse.json({
      status: "complete",
      token: key,
      expiresAt: keyExpires.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  }
  
  return NextResponse.json({ status: record.status });
}
