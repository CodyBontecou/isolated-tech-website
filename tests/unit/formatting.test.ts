/**
 * Unit tests for formatting utilities
 * Tests price formatting, date formatting, and currency display
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatPrice,
  formatDate,
  formatCurrency,
  formatRelativeTime,
} from "@/lib/formatting";

describe("formatPrice", () => {
  it("should return 'App Store' for iOS-only apps", () => {
    expect(formatPrice(0, null, ["ios"])).toBe("App Store");
    expect(formatPrice(999, null, ["ios"])).toBe("App Store");
    expect(formatPrice(0, 500, ["ios"])).toBe("App Store");
  });

  it("should return 'Name your price' for macOS apps with min_price_cents=0", () => {
    expect(formatPrice(0, null, ["macos"])).toBe("Name your price");
    expect(formatPrice(0, 500, ["macos"])).toBe("Name your price");
  });

  it("should return formatted price for macOS apps with min_price > 0", () => {
    expect(formatPrice(999, null, ["macos"])).toBe("From $9.99");
    expect(formatPrice(500, 1000, ["macos"])).toBe("From $5.00");
    expect(formatPrice(100, null, ["macos"])).toBe("From $1.00");
  });

  it("should return formatted price for cross-platform apps", () => {
    expect(formatPrice(999, null, ["ios", "macos"])).toBe("From $9.99");
    expect(formatPrice(0, null, ["ios", "macos"])).toBe("Name your price");
  });

  it("should handle undefined platforms", () => {
    expect(formatPrice(999, null)).toBe("From $9.99");
    expect(formatPrice(0, null)).toBe("Name your price");
  });

  it("should handle empty platforms array", () => {
    expect(formatPrice(999, null, [])).toBe("From $9.99");
    expect(formatPrice(0, null, [])).toBe("Name your price");
  });
});

describe("formatDate", () => {
  it("should format date string correctly", () => {
    // Use ISO strings to avoid timezone issues
    expect(formatDate("2026-02-27T12:00:00Z")).toBe("Feb 27, 2026");
    expect(formatDate("2025-12-25T12:00:00Z")).toBe("Dec 25, 2025");
    expect(formatDate("2024-01-01T12:00:00Z")).toBe("Jan 1, 2024");
  });

  it("should handle ISO date strings", () => {
    expect(formatDate("2026-02-27T14:30:00Z")).toBe("Feb 27, 2026");
  });

  it("should handle various date formats", () => {
    const result = formatDate("2026-06-15T12:00:00.000Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2026");
  });
});

describe("formatCurrency", () => {
  it("should return 'Free' for 0 cents", () => {
    expect(formatCurrency(0)).toBe("Free");
  });

  it("should format positive amounts correctly", () => {
    expect(formatCurrency(999)).toBe("$9.99");
    expect(formatCurrency(500)).toBe("$5.00");
    expect(formatCurrency(100)).toBe("$1.00");
    expect(formatCurrency(1)).toBe("$0.01");
    expect(formatCurrency(1299)).toBe("$12.99");
  });

  it("should handle large amounts", () => {
    expect(formatCurrency(10000)).toBe("$100.00");
    expect(formatCurrency(999999)).toBe("$9999.99");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    // Mock current date to Feb 27, 2026 at noon
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-27T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'Today' for today's date", () => {
    expect(formatRelativeTime("2026-02-27T10:00:00Z")).toBe("Today");
    expect(formatRelativeTime("2026-02-27T08:00:00Z")).toBe("Today");
  });

  it("should return 'Yesterday' for yesterday's date", () => {
    expect(formatRelativeTime("2026-02-26T12:00:00Z")).toBe("Yesterday");
    expect(formatRelativeTime("2026-02-26T00:00:00Z")).toBe("Yesterday");
  });

  it("should return 'X days ago' for recent dates", () => {
    expect(formatRelativeTime("2026-02-25T12:00:00Z")).toBe("2 days ago");
    expect(formatRelativeTime("2026-02-24T12:00:00Z")).toBe("3 days ago");
    expect(formatRelativeTime("2026-02-21T12:00:00Z")).toBe("6 days ago");
  });

  it("should return 'X weeks ago' for dates within a month", () => {
    expect(formatRelativeTime("2026-02-20T12:00:00Z")).toBe("1 weeks ago");
    expect(formatRelativeTime("2026-02-13T12:00:00Z")).toBe("2 weeks ago");
    expect(formatRelativeTime("2026-02-01T12:00:00Z")).toBe("3 weeks ago");
  });

  it("should return formatted date for older dates", () => {
    const result = formatRelativeTime("2026-01-15T12:00:00Z");
    expect(result).toBe("Jan 15, 2026");
  });

  it("should return formatted date for dates more than 30 days ago", () => {
    const result = formatRelativeTime("2025-12-01T12:00:00Z");
    expect(result).toBe("Dec 1, 2025");
  });
});
