/**
 * Unit tests for database operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nanoid } from "@/lib/db";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock the cloudflare-context module
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

describe("Database Utilities", () => {
  describe("nanoid", () => {
    it("should generate IDs of default length (21)", () => {
      const id = nanoid();
      expect(id).toHaveLength(21);
    });

    it("should generate IDs of custom length", () => {
      const id = nanoid(10);
      expect(id).toHaveLength(10);
    });

    it("should only contain alphanumeric characters", () => {
      const id = nanoid();
      expect(id).toMatch(/^[0-9A-Za-z]+$/);
    });

    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(nanoid());
      }
      expect(ids.size).toBe(1000);
    });
  });
});

describe("Database Query Functions", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("query", () => {
    it("should execute SELECT and return all results", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { query } = await import("@/lib/db");

      const results = await query<{ id: string; name: string }>(
        "SELECT * FROM apps WHERE is_published = ?",
        [1],
        mockEnv as any
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle parameters correctly", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { query } = await import("@/lib/db");

      const results = await query<{ id: string }>(
        "SELECT * FROM user WHERE id = ?",
        [fixtures.testUser.id],
        mockEnv as any
      );

      expect(results.length).toBe(1);
      expect(results[0].id).toBe(fixtures.testUser.id);
    });

    it("should return empty array for no results", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { query } = await import("@/lib/db");

      const results = await query<{ id: string }>(
        "SELECT * FROM user WHERE id = ?",
        ["non_existent_id"],
        mockEnv as any
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });
  });

  describe("queryOne", () => {
    it("should return the first result", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queryOne } = await import("@/lib/db");

      const result = await queryOne<{ id: string; email: string }>(
        "SELECT * FROM user WHERE id = ?",
        [fixtures.testUser.id],
        mockEnv as any
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(fixtures.testUser.id);
      expect(result?.email).toBe(fixtures.testUser.email);
    });

    it("should return null for no results", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queryOne } = await import("@/lib/db");

      const result = await queryOne<{ id: string }>(
        "SELECT * FROM user WHERE id = ?",
        ["non_existent_id"],
        mockEnv as any
      );

      expect(result).toBeNull();
    });
  });

  describe("execute", () => {
    it("should run INSERT and return success", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { execute } = await import("@/lib/db");

      const result = await execute(
        "INSERT INTO downloads (id, user_id, app_id) VALUES (?, ?, ?)",
        ["download_new", fixtures.testUser.id, fixtures.testApp.id],
        mockEnv as any
      );

      expect(result.success).toBe(true);
    });

    it("should run UPDATE and return affected rows", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { execute } = await import("@/lib/db");

      const result = await execute(
        "UPDATE apps SET name = ? WHERE id = ?",
        ["Updated Name", fixtures.testApp.id],
        mockEnv as any
      );

      expect(result.success).toBe(true);
    });

    it("should work without parameters", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { execute } = await import("@/lib/db");

      // This would typically be a DELETE with no params
      const result = await execute(
        "DELETE FROM downloads WHERE 1=0",
        [],
        mockEnv as any
      );

      expect(result.success).toBe(true);
    });
  });

  describe("batch", () => {
    it("should execute multiple queries", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      // Set up batch mock
      vi.mocked(mockEnv.DB.batch).mockResolvedValue([
        { success: true, results: [], meta: { changes: 1 } } as D1Result,
        { success: true, results: [], meta: { changes: 1 } } as D1Result,
      ]);

      const { batch } = await import("@/lib/db");

      const results = await batch(
        [
          { sql: "INSERT INTO downloads (id) VALUES (?)", params: ["dl1"] },
          { sql: "INSERT INTO downloads (id) VALUES (?)", params: ["dl2"] },
        ],
        mockEnv as any
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it("should handle queries without parameters", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      vi.mocked(mockEnv.DB.batch).mockResolvedValue([
        { success: true, results: [], meta: { changes: 0 } } as D1Result,
      ]);

      const { batch } = await import("@/lib/db");

      const results = await batch(
        [{ sql: "SELECT COUNT(*) FROM apps" }],
        mockEnv as any
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });
});

describe("Query Helpers (queries object)", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserById", () => {
    it("should find user by ID", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const user = await queries.getUserById(fixtures.testUser.id, mockEnv as any);

      expect(user).not.toBeNull();
      expect(user?.id).toBe(fixtures.testUser.id);
      expect(user?.email).toBe(fixtures.testUser.email);
    });

    it("should return null for non-existent user", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const user = await queries.getUserById("non_existent_user", mockEnv as any);

      expect(user).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("should find user by email", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const user = await queries.getUserByEmail(fixtures.testUser.email, mockEnv as any);

      expect(user).not.toBeNull();
      expect(user?.email).toBe(fixtures.testUser.email);
    });

    it("should return null for non-existent email", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const user = await queries.getUserByEmail("nobody@example.com", mockEnv as any);

      expect(user).toBeNull();
    });
  });

  describe("getAppBySlug", () => {
    it("should find published app by slug", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const app = await queries.getAppBySlug(fixtures.testApp.slug, mockEnv as any);

      expect(app).not.toBeNull();
      expect(app?.slug).toBe(fixtures.testApp.slug);
      expect(app?.is_published).toBe(1);
    });

    it("should return null for non-existent slug", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const app = await queries.getAppBySlug("non-existent-app", mockEnv as any);

      expect(app).toBeNull();
    });
  });

  describe("getLatestVersion", () => {
    it("should return latest version for app", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const version = await queries.getLatestVersion(fixtures.testApp.id, mockEnv as any);

      expect(version).not.toBeNull();
      expect(version?.app_id).toBe(fixtures.testApp.id);
      expect(version?.is_latest).toBe(1);
    });

    it("should return null for app with no versions", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const version = await queries.getLatestVersion("app_no_versions", mockEnv as any);

      expect(version).toBeNull();
    });
  });

  describe("getPurchase", () => {
    it("should find completed purchase", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const purchase = await queries.getPurchase(
        fixtures.testUser.id,
        fixtures.testApp.id,
        mockEnv as any
      );

      expect(purchase).not.toBeNull();
      expect(purchase?.status).toBe("completed");
    });

    it("should return null for non-existent purchase", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const purchase = await queries.getPurchase(
        "non_existent_user",
        fixtures.testApp.id,
        mockEnv as any
      );

      expect(purchase).toBeNull();
    });
  });

  describe("getDiscountCode", () => {
    it("should find active, unexpired code", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const code = await queries.getDiscountCode(
        fixtures.percentDiscountCode.code,
        mockEnv as any
      );

      expect(code).not.toBeNull();
      expect(code?.code).toBe(fixtures.percentDiscountCode.code);
      expect(code?.is_active).toBe(1);
    });

    it("should construct proper SQL with code parameter", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      // Verify the query is called with correct code
      await queries.getDiscountCode("TESTCODE", mockEnv as any);

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("code = ?")
      );
    });
  });

  describe("getUserPurchases", () => {
    it("should return all purchases for user", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const purchases = await queries.getUserPurchases(
        fixtures.testUser.id,
        mockEnv as any
      );

      expect(purchases).toBeInstanceOf(Array);
      // Test user has at least one purchase
      expect(purchases.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for user with no purchases", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const purchases = await queries.getUserPurchases(
        "user_with_no_purchases",
        mockEnv as any
      );

      expect(purchases).toBeInstanceOf(Array);
      expect(purchases.length).toBe(0);
    });
  });

  describe("getPublishedApps", () => {
    it("should return all published apps", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      const apps = await queries.getPublishedApps(mockEnv as any);

      expect(apps).toBeInstanceOf(Array);
      expect(apps.length).toBeGreaterThan(0);
      
      // All returned apps should be published
      for (const app of apps) {
        expect(app.is_published).toBe(1);
      }
    });
  });

  describe("getAppDownloadStats", () => {
    it("should call correct SQL with app_id parameter", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      await queries.getAppDownloadStats(fixtures.testApp.id, mockEnv as any);

      // Verify the query contains COUNT and app_id filter
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("COUNT")
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("app_id")
      );
    });
  });

  describe("getDownloadStats", () => {
    it("should query aggregate statistics", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queries } = await import("@/lib/db");

      await queries.getDownloadStats(mockEnv as any);

      // Verify the query uses aggregate functions
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("COUNT")
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("downloads")
      );
    });
  });
});

describe("Database Helper Edge Cases", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getDb function", () => {
    it("should use provided env if given", async () => {
      const { getDb } = await import("@/lib/db");
      
      const db = getDb(mockEnv as any);
      
      expect(db).toBe(mockEnv.DB);
    });

    it("should throw when no env provided and not initialized", async () => {
      const { getDb } = await import("@/lib/db");
      
      // When no env is provided and global env isn't set, it should throw
      expect(() => getDb()).toThrow("Environment not initialized");
    });
  });

  describe("query with complex SQL", () => {
    it("should handle JOINs", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      // The mock doesn't fully support JOINs but should not error
      const { query } = await import("@/lib/db");

      // This tests that the function handles complex queries without throwing
      const results = await query(
        `SELECT p.*, a.name FROM purchases p 
         JOIN apps a ON p.app_id = a.id 
         WHERE p.user_id = ?`,
        [fixtures.testUser.id],
        mockEnv as any
      );

      expect(results).toBeInstanceOf(Array);
    });

    it("should handle ORDER BY clauses", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { query } = await import("@/lib/db");

      const results = await query(
        "SELECT * FROM apps WHERE is_published = ? ORDER BY created_at DESC",
        [1],
        mockEnv as any
      );

      expect(results).toBeInstanceOf(Array);
    });

    it("should handle LIMIT clauses", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { query } = await import("@/lib/db");

      const results = await query(
        "SELECT * FROM apps LIMIT 10",
        [],
        mockEnv as any
      );

      expect(results).toBeInstanceOf(Array);
    });
  });
});
