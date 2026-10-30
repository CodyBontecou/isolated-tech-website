/** Apple-generated account token, shared with whereday.com's acquisition links. */
const PROVIDER_TOKEN = "126424970";
const APP_ID = "6761960794";

export function wheredayCampaign(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return "isolated-home";
  if (path === "/apps") return "isolated-apps";
  if (path === "/apps/whereday") return "isolated-whereday";
  if (path === "/apps/isome") return "isolated-isome";
  if (path === "/apps/iso-me") return "isolated-iso-me";

  // Apple's limit is 30 characters. A path hash keeps long article slugs distinct.
  let hash = 2166136261;
  for (const character of path) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  const label = path.replace(/^\//, "").replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 12);
  return `isolated-${label}-${hash.toString(16).padStart(8, "0")}`;
}

/** Tag only Whereday's real App Store links; leave other apps/destinations intact. */
export function wheredayCampaignUrl(href: string, pathname: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (url.protocol !== "https:" || url.hostname !== "apps.apple.com" ||
      !new RegExp(`/id${APP_ID}(?:/|$)`).test(url.pathname)) return href;

  url.searchParams.set("pt", PROVIDER_TOKEN);
  url.searchParams.set("ct", wheredayCampaign(pathname));
  url.searchParams.set("mt", "8");
  return url.toString();
}

/** Apply attribution to download links embedded in rendered blog/docs/guide bodies. */
export function wheredayCampaignHtml(html: string, pathname: string): string {
  return html.replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi, (match, prefix, quote, href) => {
    const decoded = href.replace(/&amp;/g, "&");
    const tagged = wheredayCampaignUrl(decoded, pathname);
    if (tagged === decoded) return match;
    return prefix + quote + tagged.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") + quote;
  });
}
