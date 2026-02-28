/**
 * Mock Stripe for testing
 * Provides mock implementations of Stripe API calls
 */

import { vi } from "vitest";
import Stripe from "stripe";

// ============================================================================
// Mock Data Generators
// ============================================================================

export function createMockCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: `cs_test_${Date.now()}`,
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    status: "complete",
    customer_email: "test@example.com",
    amount_total: 999,
    currency: "usd",
    url: "https://checkout.stripe.com/test",
    success_url: "https://isolated.tech/dashboard",
    cancel_url: "https://isolated.tech/apps/test-app",
    payment_intent: `pi_test_${Date.now()}`,
    metadata: {
      app_id: "app_123",
      user_id: "user_123",
      user_email: "test@example.com",
      user_name: "Test User",
      discount_code_id: "",
      original_price_cents: "999",
      final_price_cents: "999",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

export function createMockCharge(
  overrides: Partial<Stripe.Charge> = {}
): Stripe.Charge {
  return {
    id: `ch_test_${Date.now()}`,
    object: "charge",
    amount: 999,
    currency: "usd",
    status: "succeeded",
    payment_intent: `pi_test_${Date.now()}`,
    refunded: false,
    ...overrides,
  } as Stripe.Charge;
}

export function createMockStripeEvent(
  type: string,
  data: unknown
): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}`,
    object: "event",
    type,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    api_version: "2023-10-16",
  } as Stripe.Event;
}

// ============================================================================
// Mock Stripe Client
// ============================================================================

export interface MockStripeState {
  sessions: Map<string, Stripe.Checkout.Session>;
  charges: Map<string, Stripe.Charge>;
}

export function createMockStripe(initialState?: MockStripeState): Stripe {
  const state: MockStripeState = initialState || {
    sessions: new Map(),
    charges: new Map(),
  };

  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(
          async (
            params: Stripe.Checkout.SessionCreateParams
          ): Promise<Stripe.Checkout.Session> => {
            const session = createMockCheckoutSession({
              customer_email: params.customer_email,
              success_url: params.success_url,
              cancel_url: params.cancel_url,
              metadata: params.metadata as Record<string, string>,
              amount_total: params.line_items?.[0]?.price_data?.unit_amount,
            });
            state.sessions.set(session.id, session);
            return session;
          }
        ),
        retrieve: vi.fn(async (id: string): Promise<Stripe.Checkout.Session | null> => {
          return state.sessions.get(id) || null;
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn(
        (payload: string, signature: string, secret: string): Stripe.Event => {
          // In tests, we'll pass the event type and data as JSON in the payload
          const data = JSON.parse(payload);
          return createMockStripeEvent(data.type, data.data);
        }
      ),
    },
    charges: {
      retrieve: vi.fn(async (id: string): Promise<Stripe.Charge | null> => {
        return state.charges.get(id) || null;
      }),
    },
  };

  return mockStripe as unknown as Stripe;
}

// ============================================================================
// Stripe Mock Helpers for Tests
// ============================================================================

/**
 * Create a webhook payload for testing
 */
export function createWebhookPayload(
  type: string,
  data: Record<string, unknown>
): string {
  return JSON.stringify({ type, data });
}

/**
 * Simulate a successful checkout completion webhook
 */
export function simulateCheckoutComplete(
  appId: string,
  userId: string,
  amountCents: number = 999
): { payload: string; event: Stripe.Event } {
  const session = createMockCheckoutSession({
    metadata: {
      app_id: appId,
      user_id: userId,
      user_email: "test@example.com",
      user_name: "Test User",
      discount_code_id: "",
      original_price_cents: amountCents.toString(),
      final_price_cents: amountCents.toString(),
    },
    amount_total: amountCents,
  });

  return {
    payload: createWebhookPayload("checkout.session.completed", session),
    event: createMockStripeEvent("checkout.session.completed", session),
  };
}

/**
 * Simulate a refund webhook
 */
export function simulateRefund(paymentIntentId: string): {
  payload: string;
  event: Stripe.Event;
} {
  const charge = createMockCharge({
    payment_intent: paymentIntentId,
    refunded: true,
  });

  return {
    payload: createWebhookPayload("charge.refunded", charge),
    event: createMockStripeEvent("charge.refunded", charge),
  };
}
