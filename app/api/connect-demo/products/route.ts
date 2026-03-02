import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { queryOne } from "@/lib/db";
import {
  CONNECT_DEMO_FEE_PERCENT,
  calculateConnectDemoApplicationFee,
  createConnectDemoStripeClient,
} from "@/lib/stripe-connect-demo";

interface CreateProductBody {
  name?: string;
  description?: string;
  priceInCents?: number;
  currency?: string;
}

interface UserStripeAccountRow {
  stripe_account_id: string | null;
}

/**
 * POST /api/connect-demo/products
 *
 * Creates a Stripe Product on the PLATFORM account (not on connected account).
 * Product metadata stores product->connected-account mapping for checkout routing.
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error: missing DB or AUTH_KV binding." },
        { status: 500 }
      );
    }

    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to create products." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CreateProductBody;

    const name = body.name?.trim();
    const description = body.description?.trim() || undefined;
    const priceInCents = Number(body.priceInCents);
    const currency = (body.currency || "usd").toLowerCase();

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceInCents) || priceInCents < 50) {
      return NextResponse.json(
        { error: "priceInCents must be a number >= 50 (minimum 50 cents)." },
        { status: 400 }
      );
    }

    const userRow = await queryOne<UserStripeAccountRow>(
      "SELECT stripe_account_id FROM user WHERE id = ?",
      [user.id],
      env
    );

    if (!userRow?.stripe_account_id) {
      return NextResponse.json(
        {
          error:
            "No connected account found. Click 'Onboard to collect payments' first.",
        },
        { status: 400 }
      );
    }

    const applicationFeeAmount = calculateConnectDemoApplicationFee(
      priceInCents,
      CONNECT_DEMO_FEE_PERCENT
    );

    // Use one Stripe Client for this full request.
    const stripeClient = createConnectDemoStripeClient(env);

    /**
     * Platform-level product creation:
     * - This call is intentionally made on the platform account.
     * - We store connected account mapping in product metadata.
     */
    const product = await stripeClient.products.create({
      name,
      description,
      default_price_data: {
        unit_amount: priceInCents,
        currency,
      },
      metadata: {
        connected_account_id: userRow.stripe_account_id,
        application_fee_amount: String(applicationFeeAmount),
        created_by_user_id: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        defaultPriceId:
          typeof product.default_price === "string"
            ? product.default_price
            : product.default_price?.id || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect demo product creation error:", error);

    return NextResponse.json(
      {
        error: "Failed to create platform product.",
        details: message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/connect-demo/products
 *
 * Returns all platform products plus all connected accounts for storefront display.
 */
export async function GET() {
  try {
    const env = getEnv();

    if (!env?.DB) {
      return NextResponse.json(
        { error: "Server configuration error: missing DB binding." },
        { status: 500 }
      );
    }

    const stripeClient = createConnectDemoStripeClient(env);

    const productList = await stripeClient.products.list({
      active: true,
      limit: 100,
      expand: ["data.default_price"],
    });

    // Load all users who have connected accounts so the storefront can show account roster.
    const accountRows = await env.DB.prepare(
      `SELECT id, name, email, stripe_account_id
       FROM user
       WHERE stripe_account_id IS NOT NULL
       ORDER BY "createdAt" DESC`
    ).all<{ id: string; name: string | null; email: string; stripe_account_id: string }>();

    const connectedAccounts = (accountRows.results || []).map((row) => ({
      userId: row.id,
      displayName: row.name || row.email,
      email: row.email,
      accountId: row.stripe_account_id,
    }));

    const products = productList.data.map((product) => {
      const defaultPrice =
        typeof product.default_price === "string"
          ? null
          : product.default_price;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        connectedAccountId: product.metadata.connected_account_id || null,
        applicationFeeAmount: product.metadata.application_fee_amount
          ? Number(product.metadata.application_fee_amount)
          : null,
        priceInCents: defaultPrice?.unit_amount ?? null,
        currency: defaultPrice?.currency ?? null,
      };
    });

    return NextResponse.json({
      products,
      connectedAccounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect demo product listing error:", error);

    return NextResponse.json(
      {
        error: "Failed to load storefront data.",
        details: message,
      },
      { status: 500 }
    );
  }
}
