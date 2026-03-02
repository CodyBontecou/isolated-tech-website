/**
 * Integration tests for seller onboarding endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import { createMockUser } from "../mocks/auth";

vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createStripeClient: vi.fn(),
  createConnectAccount: vi.fn(),
  createAccountLink: vi.fn(),
  getBaseUrl: vi.fn(() => "https://isolated.tech"),
  isMissingStripeAccountError: vi.fn(),
}));

describe("POST /api/seller/onboard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create onboarding link for a new seller", async () => {
    const user = createMockUser({ id: "user_new_seller", email: "seller@example.com" });

    const mockEnv = createMockEnv({
      d1State: {
        tables: new Map([
          ["user", [{ id: user.id, email: user.email, stripe_account_id: null, stripe_onboarded: 0 }]],
        ]),
      },
    });

    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
    const {
      createStripeClient,
      createConnectAccount,
      createAccountLink,
      isMissingStripeAccountError,
    } = await import("@/lib/stripe");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: user as any,
      session: { id: "session_123" } as any,
    });
    vi.mocked(createStripeClient).mockReturnValue({} as any);
    vi.mocked(createConnectAccount).mockResolvedValue({ id: "acct_new_123" } as any);
    vi.mocked(createAccountLink).mockResolvedValue({ url: "https://connect.stripe.com/onboarding" } as any);
    vi.mocked(isMissingStripeAccountError).mockReturnValue(false);

    const { POST } = await import("@/app/api/seller/onboard/route");

    const request = new Request("https://isolated.tech/api/seller/onboard", {
      method: "POST",
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toBe("https://connect.stripe.com/onboarding");
    expect(createConnectAccount).toHaveBeenCalledTimes(1);
    expect(createAccountLink).toHaveBeenCalledTimes(1);
  });

  it("should recreate stale Stripe account and retry onboarding link", async () => {
    const user = createMockUser({ id: "user_stale_seller", email: "seller@example.com" });

    const mockEnv = createMockEnv({
      d1State: {
        tables: new Map([
          ["user", [{ id: user.id, email: user.email, stripe_account_id: "acct_old_123", stripe_onboarded: 0 }]],
        ]),
      },
    });

    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
    const {
      createStripeClient,
      createConnectAccount,
      createAccountLink,
      isMissingStripeAccountError,
    } = await import("@/lib/stripe");

    const stripeMissingAccountError = {
      code: "resource_missing",
      param: "account",
      message: "No such account: acct_old_123",
    };

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: user as any,
      session: { id: "session_123" } as any,
    });
    vi.mocked(createStripeClient).mockReturnValue({} as any);
    vi.mocked(createConnectAccount).mockResolvedValue({ id: "acct_new_456" } as any);
    vi.mocked(createAccountLink)
      .mockRejectedValueOnce(stripeMissingAccountError as any)
      .mockResolvedValueOnce({ url: "https://connect.stripe.com/onboarding/new" } as any);
    vi.mocked(isMissingStripeAccountError).mockImplementation(
      (error) => (error as any)?.code === "resource_missing"
    );

    const { POST } = await import("@/app/api/seller/onboard/route");

    const request = new Request("https://isolated.tech/api/seller/onboard", {
      method: "POST",
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toBe("https://connect.stripe.com/onboarding/new");
    expect(createConnectAccount).toHaveBeenCalledTimes(1);
    expect(createAccountLink).toHaveBeenCalledTimes(2);
  });

  it("should include error details when onboarding fails", async () => {
    const user = createMockUser({ id: "user_failure", email: "seller@example.com" });

    const mockEnv = createMockEnv({
      d1State: {
        tables: new Map([
          ["user", [{ id: user.id, email: user.email, stripe_account_id: null, stripe_onboarded: 0 }]],
        ]),
      },
    });

    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
    const {
      createStripeClient,
      createConnectAccount,
      createAccountLink,
      isMissingStripeAccountError,
    } = await import("@/lib/stripe");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: user as any,
      session: { id: "session_123" } as any,
    });
    vi.mocked(createStripeClient).mockReturnValue({} as any);
    vi.mocked(createConnectAccount).mockResolvedValue({ id: "acct_new_fail" } as any);
    vi.mocked(createAccountLink).mockRejectedValue(new Error("Stripe unavailable"));
    vi.mocked(isMissingStripeAccountError).mockReturnValue(false);

    const { POST } = await import("@/app/api/seller/onboard/route");

    const request = new Request("https://isolated.tech/api/seller/onboard", {
      method: "POST",
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to start onboarding");
    expect(data.details).toBe("Stripe unavailable");
  });
});
