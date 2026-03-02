import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import {
  createConnectDemoStripeClient,
  getConnectDemoWebhookSecret,
} from "@/lib/stripe-connect-demo";

/**
 * POST /api/webhooks/stripe-connect-demo
 *
 * Thin-event webhook endpoint for Connect v2 account requirement updates.
 *
 * CLI example:
 * stripe listen \
 *   --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' \
 *   --forward-thin-to http://localhost:3000/api/webhooks/stripe-connect-demo
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header." },
        { status: 400 }
      );
    }

    const payload = await request.text();

    // Single Stripe client for all webhook-related API calls.
    const stripeClient = createConnectDemoStripeClient(env);
    const webhookSecret = getConnectDemoWebhookSecret(env);

    /**
     * NOTE: New Stripe SDK versions use parseEventNotification for thin events.
     * Older examples may still refer to parseThinEvent.
     */
    const eventNotification = stripeClient.parseEventNotification(
      payload,
      signature,
      webhookSecret
    );

    // Fetch the full thin event payload so we can inspect details safely.
    const fullEvent = await stripeClient.v2.core.events.retrieve(
      eventNotification.id
    );

    const eventType = fullEvent.type;

    if (
      eventType === "v2.core.account[requirements].updated" ||
      eventType ===
        "v2.core.account[configuration.recipient].capability_status_updated"
    ) {
      // For both events, we fetch the current account state and react to latest requirements.
      const accountId =
        (fullEvent as { related_object?: { id?: string } }).related_object?.id ||
        null;

      if (!accountId) {
        console.warn("Connect demo webhook received event without related account ID", {
          eventId: fullEvent.id,
          eventType,
        });
      } else {
        const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
          include: ["configuration.recipient", "requirements"],
        });

        const transfersStatus =
          account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers
            ?.status || "unknown";

        const requirementsStatus =
          account.requirements?.summary?.minimum_deadline?.status || "unknown";

        /**
         * This is where you would trigger user notifications/tasks in a production app:
         * - email seller when requirements become currently_due/past_due
         * - suspend payouts if recipient capability drops from active
         */
        console.log("Connect demo webhook account update", {
          eventId: fullEvent.id,
          eventType,
          accountId,
          transfersStatus,
          requirementsStatus,
        });
      }
    } else {
      // Keep endpoint resilient: acknowledge unsupported event types.
      console.log("Connect demo webhook ignored event", {
        eventId: fullEvent.id,
        eventType,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect demo webhook error:", error);

    // Signature verification or missing secret errors should be explicit.
    return NextResponse.json(
      {
        error: "Failed to process Connect thin webhook event.",
        details: message,
      },
      { status: 400 }
    );
  }
}
