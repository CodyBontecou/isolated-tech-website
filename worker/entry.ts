/**
 * Custom Cloudflare Worker entry point for ISOLATED.TECH
 *
 * This wraps vinext's app-router-entry to provide access to Cloudflare
 * bindings (env) in route handlers via AsyncLocalStorage.
 */

// @ts-expect-error — virtual module resolved by vinext
import rscHandler from "virtual:vinext-rsc-entry";
import { runWithCloudflareContext } from "../lib/cloudflare-context";
import type { Env } from "../lib/env";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Block protocol-relative URL open redirect attacks (//evil.com/).
    if (url.pathname.startsWith("//")) {
      return new Response("404 Not Found", { status: 404 });
    }

    // Run the RSC handler with Cloudflare context available
    return runWithCloudflareContext({ env, ctx }, async () => {
      const result = await rscHandler(request);

      if (result instanceof Response) {
        return result;
      }

      if (result === null || result === undefined) {
        return new Response("Not Found", { status: 404 });
      }

      return new Response(String(result), { status: 200 });
    });
  },
};
