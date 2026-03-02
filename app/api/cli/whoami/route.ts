import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/cli/whoami
 * 
 * Return the current authenticated user's info.
 * Requires API key authentication.
 */
export async function GET(request: NextRequest) {
  const env = getEnv();
  
  const user = await requireAdmin(request, env);
  
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    isSuperuser: user.isSuperuser,
    isSeller: user.isSeller,
  });
}
