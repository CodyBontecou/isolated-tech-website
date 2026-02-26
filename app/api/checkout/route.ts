/**
 * POST /api/checkout
 *
 * Create a Stripe Checkout session for app purchase.
 * Handles both paid and free apps.
 * For source code distribution, generates one-time download token and sends email.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { createStripeClient, getBaseUrl } from "@/lib/stripe";
import { nanoid } from "@/lib/db";
import { sendEmail, generateSourceCodeEmail } from "@/lib/email";

interface CheckoutRequest {
  appId: string;
  priceCents: number;
  discountCode?: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  icon_url: string | null;
  min_price_cents: number;
  distribution_type: string;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  app_id: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: number;
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

    // Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to purchase" },
        { status: 401 }
      );
    }

    // Parse request
    const body: CheckoutRequest = await request.json();
    const { appId, priceCents, discountCode } = body;

    if (!appId) {
      return NextResponse.json({ error: "App ID required" }, { status: 400 });
    }

    // Get app
    const app = await env.DB.prepare(
      `SELECT id, name, slug, tagline, icon_url, min_price_cents, 
              COALESCE(distribution_type, 'binary') as distribution_type 
       FROM apps WHERE id = ?`
    )
      .bind(appId)
      .first<App>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const isSourceCode = app.distribution_type === "source_code";

    // Check if already purchased
    const existingPurchase = await env.DB.prepare(
      `SELECT id FROM purchases WHERE user_id = ? AND app_id = ? AND status = 'completed'`
    )
      .bind(user.id, appId)
      .first<{ id: string }>();

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already own this app" },
        { status: 400 }
      );
    }

    // Calculate final price
    let finalPriceCents = Math.max(priceCents || 0, app.min_price_cents);
    let usedDiscountCode: DiscountCode | null = null;

    // Apply discount code if provided
    if (discountCode) {
      const code = await env.DB.prepare(
        `SELECT * FROM discount_codes WHERE code = ? AND is_active = 1`
      )
        .bind(discountCode.toUpperCase())
        .first<DiscountCode>();

      if (code) {
        // Validate code
        const isValid =
          (!code.app_id || code.app_id === appId) &&
          (!code.max_uses || code.times_used < code.max_uses) &&
          (!code.expires_at || new Date(code.expires_at) > new Date());

        if (isValid) {
          usedDiscountCode = code;

          if (code.discount_type === "percent") {
            const discount = Math.round(
              (finalPriceCents * code.discount_value) / 100
            );
            finalPriceCents = Math.max(0, finalPriceCents - discount);
          } else {
            finalPriceCents = Math.max(0, finalPriceCents - code.discount_value);
          }
        }
      }
    }

    const baseUrl = getBaseUrl(request);

    // Handle free purchase (price = 0)
    if (finalPriceCents === 0) {
      // Create purchase directly
      const purchaseId = nanoid();
      const now = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO purchases (id, user_id, app_id, amount_cents, discount_code_id, status, created_at)
         VALUES (?, ?, ?, 0, ?, 'completed', ?)`
      )
        .bind(
          purchaseId,
          user.id,
          appId,
          usedDiscountCode?.id || null,
          now
        )
        .run();

      // Increment discount code usage
      if (usedDiscountCode) {
        await env.DB.prepare(
          `UPDATE discount_codes SET times_used = times_used + 1 WHERE id = ?`
        )
          .bind(usedDiscountCode.id)
          .run();
      }

      // For source code: Generate download token and send email
      if (isSourceCode) {
        const token = nanoid(32); // Longer token for security
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
            purchaseId,
            expiresAt.toISOString(),
            now
          )
          .run();

        const downloadUrl = `${baseUrl}/api/download/token/${token}`;
        
        // Send email with download link
        const { html, text } = generateSourceCodeEmail(
          app.name,
          0,
          user.name || null,
          downloadUrl,
          7
        );

        await sendEmail(
          {
            to: user.email,
            subject: `Your ${app.name} Source Code Download`,
            html,
            text,
          },
          env
        );

        return NextResponse.json({
          success: true,
          free: true,
          sourceCode: true,
          message: "Check your email for the download link!",
          redirectUrl: `${baseUrl}/dashboard?purchased=${app.slug}&emailed=1`,
        });
      }

      return NextResponse.json({
        success: true,
        free: true,
        redirectUrl: `${baseUrl}/dashboard?purchased=${app.slug}`,
      });
    }

    // Create Stripe checkout session
    console.log("Creating Stripe client...");
    const stripe = createStripeClient(env);

    if (!stripe) {
      console.error("Stripe client is null - STRIPE_SECRET_KEY not configured");
      return NextResponse.json(
        { error: "Payment processing not configured" },
        { status: 503 }
      );
    }

    console.log("Stripe client created, creating checkout session...");
    console.log("Session params:", {
      user_email: user.email,
      app_name: app.name,
      finalPriceCents,
      baseUrl,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: finalPriceCents,
            product_data: {
              name: isSourceCode ? `${app.name} (Source Code)` : app.name,
              description: app.tagline || undefined,
              images: app.icon_url ? [`${baseUrl}${app.icon_url}`] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        app_id: app.id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || "",
        discount_code_id: usedDiscountCode?.id || "",
        original_price_cents: priceCents.toString(),
        final_price_cents: finalPriceCents.toString(),
        is_source_code: isSourceCode ? "1" : "0",
      },
      success_url: isSourceCode 
        ? `${baseUrl}/dashboard?purchased=${app.slug}&emailed=1`
        : `${baseUrl}/dashboard?purchased=${app.slug}`,
      cancel_url: `${baseUrl}/apps/${app.slug}`,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    // Log full error details for Stripe errors
    if (error && typeof error === 'object') {
      console.error("Error type:", error.constructor?.name);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: "Failed to create checkout session", 
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
}
