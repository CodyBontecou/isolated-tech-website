import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudflare-context", () => ({ getEnv: vi.fn() }));
vi.mock("@/lib/auth", () => ({ createAuth: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("E2E authentication endpoint production guard", () => {
  for (const method of ["POST", "DELETE"] as const) {
    it(`rejects ${method} without reading bindings or setting cookies in production`, async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.resetModules();
      const route = await import("@/app/api/test/auth/route");
      const { getEnv } = await import("@/lib/cloudflare-context");
      const response = await route[method](new NextRequest("https://isolated.tech/api/test/auth", { method }));
      expect(response.status).toBe(403);
      expect(response.headers.has("set-cookie")).toBe(false);
      expect(getEnv).not.toHaveBeenCalled();
    });
  }
});
