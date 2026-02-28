/**
 * Unit tests for platform utilities
 * Tests platform parsing and helper functions
 */

import { describe, it, expect } from "vitest";
import {
  getPlatforms,
  hasIOS,
  hasMacOS,
  isIOSOnly,
  isMacOSOnly,
  hasBothPlatforms,
  getPlatformLabel,
} from "@/lib/platform";

describe("getPlatforms", () => {
  it("should parse JSON array", () => {
    expect(getPlatforms('["ios"]')).toEqual(["ios"]);
    expect(getPlatforms('["macos"]')).toEqual(["macos"]);
    expect(getPlatforms('["ios", "macos"]')).toEqual(["ios", "macos"]);
  });

  it("should parse plain string", () => {
    expect(getPlatforms("ios")).toEqual(["ios"]);
    expect(getPlatforms("macos")).toEqual(["macos"]);
  });

  it("should parse comma-separated string", () => {
    expect(getPlatforms("ios,macos")).toEqual(["ios", "macos"]);
    expect(getPlatforms("ios, macos")).toEqual(["ios", "macos"]);
    expect(getPlatforms(" ios , macos ")).toEqual(["ios", "macos"]);
  });

  it("should return empty array for empty string", () => {
    expect(getPlatforms("")).toEqual([]);
  });

  it("should handle JSON-encoded single string", () => {
    expect(getPlatforms('"ios"')).toEqual(["ios"]);
  });
});

describe("hasIOS", () => {
  it("should return true when platforms include ios", () => {
    expect(hasIOS(["ios"])).toBe(true);
    expect(hasIOS(["ios", "macos"])).toBe(true);
  });

  it("should return false when platforms do not include ios", () => {
    expect(hasIOS(["macos"])).toBe(false);
    expect(hasIOS([])).toBe(false);
  });
});

describe("hasMacOS", () => {
  it("should return true when platforms include macos", () => {
    expect(hasMacOS(["macos"])).toBe(true);
    expect(hasMacOS(["ios", "macos"])).toBe(true);
  });

  it("should return false when platforms do not include macos", () => {
    expect(hasMacOS(["ios"])).toBe(false);
    expect(hasMacOS([])).toBe(false);
  });
});

describe("isIOSOnly", () => {
  it("should return true for iOS-only apps", () => {
    expect(isIOSOnly(["ios"])).toBe(true);
  });

  it("should return false for macOS-only apps", () => {
    expect(isIOSOnly(["macos"])).toBe(false);
  });

  it("should return false for cross-platform apps", () => {
    expect(isIOSOnly(["ios", "macos"])).toBe(false);
  });

  it("should return false for empty platforms", () => {
    expect(isIOSOnly([])).toBe(false);
  });
});

describe("isMacOSOnly", () => {
  it("should return true for macOS-only apps", () => {
    expect(isMacOSOnly(["macos"])).toBe(true);
  });

  it("should return false for iOS-only apps", () => {
    expect(isMacOSOnly(["ios"])).toBe(false);
  });

  it("should return false for cross-platform apps", () => {
    expect(isMacOSOnly(["ios", "macos"])).toBe(false);
  });

  it("should return false for empty platforms", () => {
    expect(isMacOSOnly([])).toBe(false);
  });
});

describe("hasBothPlatforms", () => {
  it("should return true for cross-platform apps", () => {
    expect(hasBothPlatforms(["ios", "macos"])).toBe(true);
    expect(hasBothPlatforms(["macos", "ios"])).toBe(true);
  });

  it("should return false for single-platform apps", () => {
    expect(hasBothPlatforms(["ios"])).toBe(false);
    expect(hasBothPlatforms(["macos"])).toBe(false);
  });

  it("should return false for empty platforms", () => {
    expect(hasBothPlatforms([])).toBe(false);
  });
});

describe("getPlatformLabel", () => {
  it("should return correct labels", () => {
    expect(getPlatformLabel("ios")).toBe("iOS");
    expect(getPlatformLabel("macos")).toBe("macOS");
    expect(getPlatformLabel("web")).toBe("Web");
  });

  it("should uppercase unknown platforms", () => {
    expect(getPlatformLabel("android" as any)).toBe("ANDROID");
  });
});
