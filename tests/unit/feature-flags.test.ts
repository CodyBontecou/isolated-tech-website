import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("keeps the seller program off by default", () => {
    expect(FEATURE_FLAGS.sellerProgram).toBe(false);
    expect(isFeatureEnabled("sellerProgram")).toBe(false);
  });
});
