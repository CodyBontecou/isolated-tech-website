/**
 * POST /api/download/[appId]/request
 *
 * Request a new download link for an already purchased source code app.
 * Generates a new one-time download token and sends email.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { nanoid } from "@/lib/db";
import { sendEmail, generateSourceCodeEmail } from "@/lib/email";

interface App {
  id: string;
  name: string;
  slug: string;
  distribution_type: string;
}

interface Purchase {
  id: string;
  amount_cents: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    const { appId } = params;

    // Get app
    const app = await env.DB.prepare(
      `SELECT id, name, slug, COALESCE(distribution_type, 'binary') as distribution_type 
       FROM apps WHERE id = ?`
    )
      .bind(appId)
      .first<App>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Only source code apps can request download links
    if (app.distribution_type !== "source_code") {
      return NextResponse.json(
        { error: "This app doesn't support download links" },
        { status: 400 }
      );
    }

    // Check if user has purchased this app
    const purchase = await env.DB.prepare(
      `SELECT id, amount_cents FROM purchases 
       WHERE user_id = ? AND app_id = ? AND status = 'completed'`
    )
      .bind(user.id, appId)
      .first<Purchase>();

    if (!purchase) {
      return NextResponse.json(
        { error: "You don't own this app" },
        { status: 403 }
      );
    }

    // Generate new download token
    const now = new Date().toISOString();
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await env.DB.prepare(
      `INSERT INTO download_tokens (id, token, user_id, app_id, purchase_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        nanoid(),
        token,
        user.id,
        appId,
        purchase.id,
        expiresAt.toISOString(),
        now
      )
      .run();

    // Get base URL
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const downloadUrl = `${baseUrl}/api/download/token/${token}`;

    // Send email with download link
    const { html, text } = generateSourceCodeEmail(
      app.name,
      purchase.amount_cents,
      user.name || null,
      downloadUrl,
      7
    );

    const emailResult = await sendEmail(
      {
        to: user.email,
        subject: `Your ${app.name} Source Code Download`,
        html,
        text,
      },
      env
    );

    if (!emailResult) {
      console.error("Failed to send download email to:", user.email);
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Download link sent! Check your email.",
    });
  } catch (error) {
    console.error("Download request error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to request download link", details: errorMessage },
      { status: 500 }
    );
  }
}
