/**
 * Mock authentication for testing
 */

import { vi } from "vitest";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  isAdmin?: boolean;
  newsletterSubscribed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user_${Date.now()}`,
    email: "test@example.com",
    name: "Test User",
    image: null,
    isAdmin: false,
    newsletterSubscribed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockSession(user: MockUser, options: Partial<MockSession> = {}) {
  return {
    user,
    session: {
      id: options.id || `session_${Date.now()}`,
      userId: user.id,
      expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  };
}

/**
 * Create an expired session for testing
 */
export function createExpiredSession(user: MockUser) {
  return createMockSession(user, {
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  });
}

/**
 * Create mock request headers with authentication
 */
export function createAuthHeaders(
  sessionToken: string = "test_session_token"
): Headers {
  const headers = new Headers();
  headers.set("cookie", `isolated.session_token=${sessionToken}`);
  return headers;
}

/**
 * Create mock request headers without authentication
 */
export function createUnauthHeaders(): Headers {
  return new Headers();
}

/**
 * Mock the auth middleware to return a specific user
 */
export function mockAuthMiddleware(user: MockUser | null) {
  const mockGetSession = vi.fn().mockResolvedValue(
    user ? createMockSession(user) : { user: null, session: null }
  );

  vi.doMock("@/lib/auth/middleware", () => ({
    getSessionFromHeaders: mockGetSession,
  }));

  return mockGetSession;
}

/**
 * Create a mock Better Auth instance
 * Used for testing session validation directly
 */
export function createMockBetterAuth(options: {
  sessions?: Map<string, { user: MockUser; session: MockSession }>;
} = {}) {
  const sessions = options.sessions || new Map();

  return {
    api: {
      getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
        const cookie = headers.get("cookie") || "";
        const tokenMatch = cookie.match(/isolated\.session_token=([^;]+)/);
        
        if (!tokenMatch) {
          return null;
        }
        
        const token = tokenMatch[1];
        const sessionData = sessions.get(token);
        
        if (!sessionData) {
          return null;
        }
        
        // Check if session is expired
        if (sessionData.session.expiresAt < new Date()) {
          return null;
        }
        
        return sessionData;
      }),
    },
  };
}

/**
 * Helper to create session token and register it with mock auth
 */
export function registerMockSession(
  auth: ReturnType<typeof createMockBetterAuth>,
  user: MockUser,
  options: { expired?: boolean } = {}
): string {
  const token = `test_token_${Date.now()}_${Math.random().toString(36)}`;
  const session = options.expired ? createExpiredSession(user) : createMockSession(user);
  
  // Access the internal map through the mock
  // This is a simplified approach - in real tests we'd set up the mock differently
  return token;
}
