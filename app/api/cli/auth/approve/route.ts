import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { queryOne, execute } from "@/lib/db";

/**
 * POST /api/cli/auth/approve
 * 
 * Approve a device code authorization (called from web UI).
 * Requires user to be logged in via session.
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  
  // Require session auth (not API key)
  const user = await getCurrentUser(env);
  
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
  
  let body: { userCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const { userCode } = body;
  
  if (!userCode) {
    return NextResponse.json(
      { error: "userCode is required" },
      { status: 400 }
    );
  }
  
  // Find the device code
  const deviceCode = await queryOne<{
    id: string;
    status: string;
    expires_at: string;
  }>(
    `SELECT id, status, expires_at
     FROM cli_device_codes
     WHERE user_code = ?`,
    [userCode],
    env
  );
  
  if (!deviceCode) {
    return NextResponse.json(
      { error: "Invalid code" },
      { status: 404 }
    );
  }
  
  // Check expiration
  if (new Date(deviceCode.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Code has expired" },
      { status: 400 }
    );
  }
  
  // Check status
  if (deviceCode.status !== "pending") {
    return NextResponse.json(
      { error: "Code already used" },
      { status: 400 }
    );
  }
  
  // Approve the code
  await execute(
    `UPDATE cli_device_codes
     SET status = 'complete', user_id = ?
     WHERE id = ?`,
    [user.id, deviceCode.id],
    env
  );
  
  return NextResponse.json({
    success: true,
    message: "CLI authorized",
  });
}
