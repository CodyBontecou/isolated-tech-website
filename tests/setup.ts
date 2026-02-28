/**
 * Vitest global setup
 * Sets up mocks and test environment
 */

import { vi } from "vitest";

// Mock crypto for nanoid
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  } as Crypto;
}

// Mock next/headers (Server Components)
vi.mock("next/headers", () => {
  let currentHeaders = new Headers();
  let currentCookies = new Map<string, string>();

  return {
    headers: vi.fn(() => currentHeaders),
    cookies: vi.fn(() => ({
      get: (name: string) => {
        const value = currentCookies.get(name);
        return value ? { name, value } : undefined;
      },
      getAll: () => Array.from(currentCookies.entries()).map(([name, value]) => ({ name, value })),
      has: (name: string) => currentCookies.has(name),
    })),
    // Helper to set headers for testing (not part of actual next/headers API)
    __setHeaders: (h: Headers) => { currentHeaders = h; },
    __setCookies: (c: Map<string, string>) => { currentCookies = c; },
  };
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock next/server (provided by vinext in production)
vi.mock("next/server", () => {
  return {
    NextRequest: class NextRequest extends Request {
      nextUrl: URL;
      cookies: Map<string, string>;

      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, init);
        this.nextUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        this.cookies = new Map();
      }
    },
    NextResponse: class NextResponse extends Response {
      static json(data: unknown, init?: ResponseInit) {
        return new Response(JSON.stringify(data), {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...init?.headers,
          },
        });
      }

      static redirect(url: string | URL, status?: number) {
        return new Response(null, {
          status: status || 307,
          headers: { Location: url.toString() },
        });
      }
    },
  };
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
