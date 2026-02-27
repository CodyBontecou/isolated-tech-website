import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { execute, nanoid } from "@/lib/db";

/**
 * POST /api/cli/auth/initiate
 * 
 * Start the device code authentication flow.
 * Returns a device code (secret) and user code (shown to user).
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  
  // Generate codes
  const deviceCode = nanoid(32); // Secret, held by CLI
  const userCode = generateUserCode(); // Short, easy to type
  
  // Expires in 10 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  
  const id = nanoid();
  
  try {
    await execute(
      `INSERT INTO cli_device_codes (id, device_code, user_code, status, expires_at)
       VALUES (?, ?, ?, 'pending', ?)`,
      [id, deviceCode, userCode, expiresAt.toISOString()],
      env
    );
    
    const verificationUrl = `${getBaseUrl(request)}/cli/auth?code=${userCode}`;
    
    return NextResponse.json({
      deviceCode,
      userCode,
      verificationUrl,
      expiresIn: 600, // 10 minutes in seconds
    });
  } catch (error) {
    console.error("Failed to create device code:", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication" },
      { status: 500 }
    );
  }
}

/**
 * Generate a short, easy-to-type user code
 * Format: XXXX-XXXX (8 chars, no ambiguous chars)
 */
function generateUserCode(): string {
  // Exclude ambiguous characters: 0, O, I, L, 1
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return code;
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "isolated.tech";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
