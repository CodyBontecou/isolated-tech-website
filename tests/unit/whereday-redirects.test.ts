import { describe, expect, it } from "vitest";
import { wheredayRedirect } from "../../lib/whereday-redirects";

describe("Whereday permanent redirects", () => {
  it("preserves nested paths, trailing slashes, and query parameters", () => {
    for (const slug of ["isome", "iso-me"]) {
      for (const suffix of ["", "/", "/blog/journal", "/icon", "/media/abc.png"]) {
        const response = wheredayRedirect(new Request(`https://isolated.tech/apps/${slug}${suffix}?ct=original&tab=screenshots`));
        expect(response?.status).toBe(308);
        expect(response?.headers.get("Location")).toBe(`https://isolated.tech/apps/whereday${suffix}?ct=original&tab=screenshots`);
      }
    }
  });

  it("canonicalizes www and the slug in a single hop, including HEAD requests", () => {
    const response = wheredayRedirect(new Request("https://www.isolated.tech/apps/isome?x=1", { method: "HEAD" }));
    expect(response?.headers.get("Location")).toBe("https://isolated.tech/apps/whereday?x=1");
  });

  it("keeps social image, appcast, feedback and roadmap bookmarks working", () => {
    for (const path of ["/api/og/isome", "/appcast/isome.xml", "/feedback?app=isome&type=bug", "/roadmap?app=iso-me"]) {
      const response = wheredayRedirect(new Request(`https://isolated.tech${path}`));
      expect(response?.status).toBe(308);
      expect(response?.headers.get("Location")).toContain("whereday");
    }
  });

  it("does not redirect canonical URLs, other apps, similar slugs, or mutations", () => {
    for (const path of ["/apps/whereday", "/apps/isome-other", "/apps/healthmd", "/share/isome", "/api/og/isome-other", "/feedback?app=healthmd"]) {
      expect(wheredayRedirect(new Request(`https://isolated.tech${path}`))).toBeNull();
    }
    expect(wheredayRedirect(new Request("https://isolated.tech/apps/isome", { method: "POST" }))).toBeNull();
  });
});
