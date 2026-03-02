import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { getBaseUrl } from "@/lib/stripe";
import {
  CONNECT_DEMO_FEE_PERCENT,
  calculateConnectDemoApplicationFee,
  createConnectDemoStripeClient,
} from "@/lib/stripe-connect-demo";

interface CheckoutBody {
  productId?: string;
}

/**
 * POST /api/connect-demo/checkout
 *
 * Creates a hosted Checkout Session using destination charges + application fee.
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    const stripeClient = createConnectDemoStripeClient(env);

    const body = (await request.json()) as CheckoutBody;
    const productId = body.productId?.trim();

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required." },
        { status: 400 }
      );
    }

    const product = await stripeClient.products.retrieve(productId, {
      expand: ["default_price"],
    });

    const defaultPrice =
      typeof product.default_price === "string"
        ? null
        : (product.default_price as Stripe.Price | null);

    if (!defaultPrice?.unit_amount || !defaultPrice.currency) {
      return NextResponse.json(
        {
          error:
            "Product must have a default one-time price with unit_amount and currency.",
        },
        { status: 400 }
      );
    }

    const connectedAccountId = product.metadata.connected_account_id;

    if (!connectedAccountId) {
      return NextResponse.json(
        {
          error:
            "This product is missing connected_account_id metadata. Recreate product through the sample form.",
        },
        { status: 400 }
      );
    }

    // If metadata fee is present we use it; otherwise fall back to CONNECT_DEMO_FEE_PERCENT.
    const metadataFee = Number(product.metadata.application_fee_amount);
    const applicationFeeAmount = Number.isFinite(metadataFee)
      ? metadataFee
      : calculateConnectDemoApplicationFee(
          defaultPrice.unit_amount,
          CONNECT_DEMO_FEE_PERCENT
        );

    // Optional: if customer is signed in we prefill Checkout email.
    const { user } = env?.AUTH_KV
      ? await getSessionFromHeaders(request.headers, env)
      : { user: null };

    const baseUrl = getBaseUrl(request, env);

    const session = await stripeClient.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: defaultPrice.currency,
            unit_amount: defaultPrice.unit_amount,
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      mode: "payment",
      customer_email: user?.email || undefined,
      success_url: `${baseUrl}/connect-demo/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/connect-demo?canceled=1`,
      metadata: {
        product_id: product.id,
        connected_account_id: connectedAccountId,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect demo checkout error:", error);

    return NextResponse.json(
      {
        error: "Failed to create checkout session.",
        details: message,
      },
      { status: 500 }
    );
  }
}
