import { describe, expect, it } from "vitest";
import { wheredayCampaign, wheredayCampaignHtml, wheredayCampaignUrl } from "../../lib/whereday-campaigns";

const appUrl = "https://apps.apple.com/us/app/iso-me/id6761960794";

describe("Whereday page attribution", () => {
  it("uses the renamed canonical listing campaign", () => {
    expect(new URL(wheredayCampaignUrl(appUrl, "/apps/whereday")).searchParams.get("ct")).toBe("isolated-whereday");
  });
  it("uses the source page and genuine provider token, preserving other URL parameters", () => {
    const url = new URL(wheredayCampaignUrl(`${appUrl}?ct=old&pt=old&l=en#details`, "/apps/isome"));
    expect(url.pathname).toBe("/us/app/iso-me/id6761960794");
    expect(Object.fromEntries(url.searchParams)).toEqual({ ct: "isolated-isome", pt: "126424970", l: "en", mt: "8" });
    expect(url.hash).toBe("#details");
    expect(wheredayCampaignUrl(url.href, "/apps/isome/")).toBe(url.href);
  });

  it("keeps long article paths distinct within Apple's 30-character limit", () => {
    const a = wheredayCampaign("/apps/isome/blog/a-very-long-title-about-location-history");
    const b = wheredayCampaign("/apps/isome/blog/a-very-long-title-about-location-privacy");
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(30);
    expect(wheredayCampaign("/apps/isome/blog/a-very-long-title-about-location-history/?utm_source=test")).toBe(a);
    expect(wheredayCampaign("/apps/isome/docs/a-very-long-title-about-location-history")).not.toBe(a);
  });

  it("does not tag other apps, lookalike hosts, marketing-site links, or invalid URLs", () => {
    for (const href of ["https://apps.apple.com/app/id6757763969", "https://apps.apple.com/app/id67619607940", "https://apps.apple.com.evil.test/app/id6761960794", "https://whereday.com/", "/apps/isome", "not a URL"]) {
      expect(wheredayCampaignUrl(href, "/apps/isome")).toBe(href);
    }
  });

  it("tags article anchors including escaped query strings, leaving text and other links alone", () => {
    const html = `<p>Whereday</p><a class="download" href="${appUrl}?l=en&amp;ct=old">Get it</a><a href='${appUrl}'>Download</a><a href="/apps/isome">Details</a>`;
    const tagged = wheredayCampaignHtml(html, "/apps/isome/blog/journal");
    const campaign = wheredayCampaign("/apps/isome/blog/journal");
    expect(tagged.match(new RegExp(`ct=${campaign}`, "g"))).toHaveLength(2);
    expect(tagged).toContain("l=en&amp;ct=");
    expect(tagged).toContain('<a href="/apps/isome">Details</a>');
    expect(tagged).toContain("<p>Whereday</p>");
    expect(wheredayCampaignHtml(tagged, "/apps/isome/blog/journal")).toBe(tagged);
  });
});
