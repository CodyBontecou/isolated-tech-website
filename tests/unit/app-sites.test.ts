import { describe, expect, it } from "vitest";
import { getAppDisplayName, getAppHref, getAppSite } from "@/lib/app-sites";

describe("app site links", () => {
  it("uses the vox.md brand and dedicated site", () => {
    expect(getAppDisplayName("voxboard", "Voxboard")).toBe("vox.md");
    expect(getAppHref("voxboard")).toBe("https://vox.isolated.tech");
  });

  it("uses the standalone Health.md and GitSync.md domains", () => {
    expect(getAppHref("healthmd")).toBe("https://healthmd.app");
    expect(getAppHref("syncmd")).toBe("https://gitsyncmd.app");
  });

  it("keeps apps without dedicated sites in the local directory", () => {
    expect(getAppSite("pocket-repl")).toBeNull();
    expect(getAppHref("pocket-repl")).toBe("/apps/pocket-repl");
    expect(getAppDisplayName("pocket-repl", "PocketREPL")).toBe("PocketREPL");
  });
});
