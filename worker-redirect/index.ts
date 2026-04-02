/**
 * Subdomain Proxy Worker
 *
 * Routes *.isolated.tech subdomains to their respective Cloudflare Pages deployments.
 *
 * To add a new app subdomain:
 *   1. Deploy the site to Cloudflare Pages (wrangler pages deploy)
 *   2. Add an entry to SUBDOMAIN_MAP below
 *   3. Redeploy this worker (wrangler deploy --config worker-redirect/wrangler.jsonc)
 */

interface Env {}

// Maps subdomain → Cloudflare Pages .pages.dev hostname
const SUBDOMAIN_MAP: Record<string, string> = {
  consulting: "ai-consulting-1qe.pages.dev",
  syncmd: "syncmd.pages.dev",
  healthmd: "healthmd.pages.dev",
};

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Extract subdomain from *.isolated.tech
    const parts = hostname.split(".");
    if (parts.length >= 3 && parts.slice(-2).join(".") === "isolated.tech") {
      const subdomain = parts.slice(0, -2).join(".");

      // www is handled by the main isolated-tech-store worker
      if (subdomain === "www") {
        return fetch(request);
      }

      const pagesHost = SUBDOMAIN_MAP[subdomain];
      if (pagesHost) {
        const proxiedUrl = new URL(request.url);
        proxiedUrl.hostname = pagesHost;
        return fetch(proxiedUrl.toString(), request);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
