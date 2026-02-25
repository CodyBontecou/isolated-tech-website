/**
 * POST /api/discount/validate
 *
 * Validate a discount code and calculate the final price.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";

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

interface App {
  id: string;
  min_price_cents: number;
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB) {
      console.error("Missing D1 binding");
      return NextResponse.json(
        { valid: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { code, appId, originalPriceCents } = body;

    // Validate input
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Discount code is required" },
        { status: 400 }
      );
    }

    if (!appId || typeof appId !== "string") {
      return NextResponse.json(
        { valid: false, error: "App ID is required" },
        { status: 400 }
      );
    }

    if (typeof originalPriceCents !== "number" || originalPriceCents < 0) {
      return NextResponse.json(
        { valid: false, error: "Invalid price" },
        { status: 400 }
      );
    }

    // Look up discount code
    const discount = await env.DB.prepare(
      `SELECT * FROM discount_codes 
       WHERE code = ? COLLATE NOCASE 
       AND is_active = 1`
    )
      .bind(code.trim().toUpperCase())
      .first<DiscountCode>();

    if (!discount) {
      return NextResponse.json({
        valid: false,
        error: "Invalid discount code",
      });
    }

    // Check expiration
    if (discount.expires_at) {
      const expiresAt = new Date(discount.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({
          valid: false,
          error: "This discount code has expired",
        });
      }
    }

    // Check max uses
    if (discount.max_uses !== null && discount.times_used >= discount.max_uses) {
      return NextResponse.json({
        valid: false,
        error: "This discount code has reached its usage limit",
      });
    }

    // Check app restriction
    if (discount.app_id !== null && discount.app_id !== appId) {
      return NextResponse.json({
        valid: false,
        error: "This discount code is not valid for this app",
      });
    }

    // Get app minimum price
    const app = await env.DB.prepare(`SELECT id, min_price_cents FROM apps WHERE id = ?`)
      .bind(appId)
      .first<App>();

    if (!app) {
      return NextResponse.json(
        { valid: false, error: "App not found" },
        { status: 404 }
      );
    }

    // Calculate discount
    let discountAmountCents: number;

    if (discount.discount_type === "percent") {
      discountAmountCents = Math.round(
        originalPriceCents * (discount.discount_value / 100)
      );
    } else {
      // Fixed amount in cents
      discountAmountCents = discount.discount_value;
    }

    // Calculate final price (cannot go below minimum)
    const finalPriceCents = Math.max(
      originalPriceCents - discountAmountCents,
      app.min_price_cents
    );

    // Actual discount applied (may be less if hitting minimum)
    const actualDiscountCents = originalPriceCents - finalPriceCents;

    return NextResponse.json({
      valid: true,
      discountType: discount.discount_type,
      discountValue: discount.discount_value,
      discountAmountCents: actualDiscountCents,
      finalPriceCents,
      message:
        discount.discount_type === "percent"
          ? `${discount.discount_value}% off applied!`
          : `$${(discount.discount_value / 100).toFixed(2)} off applied!`,
    });
  } catch (error) {
    console.error("Discount validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate discount code" },
      { status: 500 }
    );
  }
}
