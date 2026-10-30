/** Canonical public URLs for the iso.me → Whereday rename. */
export function wheredayRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  let changed = false;
  if (url.hostname === "www.isolated.tech") {
    url.hostname = "isolated.tech";
    changed = true;
  }

  // Preserve existing www canonicalization for mutations without renaming API targets.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return changed ? Response.redirect(url.toString(), 308) : null;
  }

  // Match whole slug segments only; retain article/asset paths and the query string.
  const path = url.pathname.replace(
    /^(\/(?:apps|api\/og|appcast)\/)(?:isome|iso-me)(?=\/|$|\.xml$)/,
    "$1whereday",
  );
  if (path !== url.pathname) {
    url.pathname = path;
    changed = true;
  }
  if (["/feedback", "/roadmap"].includes(url.pathname) &&
      ["isome", "iso-me"].includes(url.searchParams.get("app") ?? "")) {
    url.searchParams.set("app", "whereday");
    changed = true;
  }
  return changed ? Response.redirect(url.toString(), 308) : null;
}
