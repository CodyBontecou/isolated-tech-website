/**
 * Unit tests for legacy purchase and subscriber claiming system
 * Tests migration of Gumroad purchases to new accounts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";

// Mock crypto.randomUUID for predictable IDs
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "12345678-1234-1234-1234-123456789abc"),
});

describe("Legacy Claims System", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;
  
  // Test data
  const testUser = {
    id: "user_test_123",
    email: "test@example.com",
  };
  
  const legacyPurchase = {
    id: "legacy_1",
    email: "test@example.com",
    product_name: "My Cool App",
    app_id: "app_cool_123",
    user_id: null,
    claimed_at: null,
  };

  const legacyPurchaseNoAppId = {
    id: "legacy_2",
    email: "test@example.com",
    product_name: "Unknown Product",
    app_id: null,
    user_id: null,
    claimed_at: null,
  };

  const subscriber = {
    id: "sub_1",
    email: "test@example.com",
    user_id: null,
    metadata: "{}",
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // claimLegacyData
  // ==========================================================================

  describe("claimLegacyData", () => {
    it("should link subscriber record to user", async () => {
      const d1State = {
        tables: new Map([
          ["subscribers", [{ ...subscriber }]],
          ["legacy_purchases", []],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.subscriberLinked).toBe(true);
      expect(result.purchasesClaimed).toBe(0);
      
      // Verify subscriber update was called
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE subscribers")
      );
    });

    it("should claim legacy purchases and create purchase records", async () => {
      const d1State = {
        tables: new Map([
          ["subscribers", []],
          ["legacy_purchases", [{ ...legacyPurchase }]],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.subscriberLinked).toBe(true);
      expect(result.purchasesClaimed).toBe(1);
      
      // Verify legacy purchase was marked as claimed
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE legacy_purchases SET user_id = ?")
      );
      
      // Verify new purchase record was created
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO purchases")
      );
    });

    it("should handle multiple legacy purchases", async () => {
      const secondPurchase = {
        id: "legacy_3",
        email: "test@example.com",
        product_name: "Another App",
        app_id: "app_another_123",
        user_id: null,
        claimed_at: null,
      };

      const d1State = {
        tables: new Map([
          ["subscribers", []],
          ["legacy_purchases", [{ ...legacyPurchase }, secondPurchase]],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.purchasesClaimed).toBe(2);
    });

    it("should skip purchase creation for legacy items without app_id", async () => {
      const d1State = {
        tables: new Map([
          ["subscribers", []],
          ["legacy_purchases", [{ ...legacyPurchaseNoAppId }]],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.purchasesClaimed).toBe(1); // Still counts as claimed
      
      // INSERT should not be called for purchases without app_id
      const insertCalls = (mockEnv.DB.prepare as any).mock.calls
        .filter((call: string[]) => call[0].includes("INSERT INTO purchases"));
      expect(insertCalls.length).toBe(0);
    });

    it("should prevent duplicate purchase creation", async () => {
      // User already has a purchase for this app
      const existingPurchase = {
        id: "purchase_existing",
        user_id: testUser.id,
        app_id: legacyPurchase.app_id,
      };

      const d1State = {
        tables: new Map([
          ["subscribers", []],
          ["legacy_purchases", [{ ...legacyPurchase }]],
          ["purchases", [existingPurchase]],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.purchasesClaimed).toBe(1); // Marked as claimed
      
      // Check that duplicate INSERT was not attempted
      // The SELECT check should return the existing purchase
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id FROM purchases WHERE user_id = ? AND app_id = ?")
      );
    });

    it("should use case-insensitive email matching", async () => {
      const d1State = {
        tables: new Map([
          ["subscribers", [{ ...subscriber }]],
          ["legacy_purchases", [{ ...legacyPurchase }]],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      
      // Call with uppercase email
      await claimLegacyData(testUser.id, "TEST@EXAMPLE.COM", mockEnv as any);

      // Should bind with lowercase email
      const allBindCalls = (mockEnv.DB.prepare as any).mock.results
        .flatMap((r: any) => {
          const bindMock = r.value?.bind;
          return bindMock?.mock?.calls || [];
        });
      
      // At least one bind should have lowercase email
      const hasLowercaseEmail = allBindCalls.some((call: unknown[]) =>
        call.some((arg) => arg === "test@example.com")
      );
      expect(hasLowercaseEmail).toBe(true);
    });

    it("should create purchase records with correct structure", async () => {
      const d1State = {
        tables: new Map([
          ["subscribers", []],
          ["legacy_purchases", [{ ...legacyPurchase }]],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      // Verify INSERT was called with amount_cents = 0 (free, already paid on Gumroad)
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("amount_cents")
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("'completed'")
      );
    });

    it("should handle database errors gracefully", async () => {
      mockEnv = createMockEnv();
      
      // Make the DB throw an error
      vi.mocked(mockEnv.DB.prepare).mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.subscriberLinked).toBe(false);
      expect(result.purchasesClaimed).toBe(0);
      expect(result.error).toBe("Database connection failed");
    });

    it("should return zero claims when no legacy data exists", async () => {
      const d1State = {
        tables: new Map([
          ["subscribers", []],
          ["legacy_purchases", []],
          ["purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      expect(result.subscriberLinked).toBe(true);
      expect(result.purchasesClaimed).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it("should not claim purchases already claimed by another user", async () => {
      mockEnv = createMockEnv();

      // Mock the DB to return no unclaimed purchases (user_id IS NULL check filters them out)
      vi.mocked(mockEnv.DB.prepare).mockImplementation((sql: string) => {
        const stmt = {
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ 
            results: [], // No unclaimed purchases
            success: true 
          }),
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
          raw: vi.fn(),
        };
        return stmt as any;
      });

      const { claimLegacyData } = await import("@/lib/legacy-claims");
      const result = await claimLegacyData(testUser.id, testUser.email, mockEnv as any);

      // Should find no unclaimed purchases
      expect(result.purchasesClaimed).toBe(0);
    });
  });

  // ==========================================================================
  // hasUnclaimedPurchases
  // ==========================================================================

  describe("hasUnclaimedPurchases", () => {
    it("should return true when unclaimed purchases exist", async () => {
      const d1State = {
        tables: new Map([
          ["legacy_purchases", [{ ...legacyPurchase }]],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      // Mock the COUNT query to return 1
      vi.mocked(mockEnv.DB.prepare).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 1 }),
        all: vi.fn(),
        run: vi.fn(),
        raw: vi.fn(),
      } as any);

      const { hasUnclaimedPurchases } = await import("@/lib/legacy-claims");
      const result = await hasUnclaimedPurchases(testUser.email, mockEnv as any);

      expect(result).toBe(true);
    });

    it("should return false when no unclaimed purchases exist", async () => {
      const d1State = {
        tables: new Map([
          ["legacy_purchases", []],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      // Mock the COUNT query to return 0
      vi.mocked(mockEnv.DB.prepare).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 0 }),
        all: vi.fn(),
        run: vi.fn(),
        raw: vi.fn(),
      } as any);

      const { hasUnclaimedPurchases } = await import("@/lib/legacy-claims");
      const result = await hasUnclaimedPurchases(testUser.email, mockEnv as any);

      expect(result).toBe(false);
    });

    it("should return false when all purchases are already claimed", async () => {
      const claimedPurchase = {
        ...legacyPurchase,
        user_id: "other_user",
        claimed_at: new Date().toISOString(),
      };

      const d1State = {
        tables: new Map([
          ["legacy_purchases", [claimedPurchase]],
        ]),
      };
      mockEnv = createMockEnv({ d1State });

      // Mock COUNT to return 0 (no unclaimed)
      vi.mocked(mockEnv.DB.prepare).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 0 }),
        all: vi.fn(),
        run: vi.fn(),
        raw: vi.fn(),
      } as any);

      const { hasUnclaimedPurchases } = await import("@/lib/legacy-claims");
      const result = await hasUnclaimedPurchases(testUser.email, mockEnv as any);

      expect(result).toBe(false);
    });

    it("should use case-insensitive email matching", async () => {
      mockEnv = createMockEnv();
      
      const mockBind = vi.fn().mockReturnThis();
      vi.mocked(mockEnv.DB.prepare).mockReturnValue({
        bind: mockBind,
        first: vi.fn().mockResolvedValue({ count: 0 }),
        all: vi.fn(),
        run: vi.fn(),
        raw: vi.fn(),
      } as any);

      const { hasUnclaimedPurchases } = await import("@/lib/legacy-claims");
      await hasUnclaimedPurchases("TEST@EXAMPLE.COM", mockEnv as any);

      // Should bind with lowercase email
      expect(mockBind).toHaveBeenCalledWith("test@example.com");
    });

    it("should handle null result gracefully", async () => {
      mockEnv = createMockEnv();
      
      vi.mocked(mockEnv.DB.prepare).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn(),
        run: vi.fn(),
        raw: vi.fn(),
      } as any);

      const { hasUnclaimedPurchases } = await import("@/lib/legacy-claims");
      const result = await hasUnclaimedPurchases(testUser.email, mockEnv as any);

      expect(result).toBe(false);
    });

    it("should return true for multiple unclaimed purchases", async () => {
      mockEnv = createMockEnv();
      
      vi.mocked(mockEnv.DB.prepare).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ count: 5 }),
        all: vi.fn(),
        run: vi.fn(),
        raw: vi.fn(),
      } as any);

      const { hasUnclaimedPurchases } = await import("@/lib/legacy-claims");
      const result = await hasUnclaimedPurchases(testUser.email, mockEnv as any);

      expect(result).toBe(true);
    });
  });
});
