// Import binding types without merging Workers' Web APIs into browser/Node globals.
import type * as Cloudflare from "@cloudflare/workers-types";

import type { Env } from "./lib/env";

declare global {
  type D1Database = Cloudflare.D1Database;
  type D1PreparedStatement = Cloudflare.D1PreparedStatement;
  type D1Result<T = unknown> = Cloudflare.D1Result<T>;
  type R2Bucket = Cloudflare.R2Bucket;
  type R2ObjectBody = Cloudflare.R2ObjectBody;
  type R2Object = Cloudflare.R2Object;
  type KVNamespace = Cloudflare.KVNamespace;
  type Fetcher = Cloudflare.Fetcher;
  type ExecutionContext = Cloudflare.ExecutionContext;
  type CfProperties = Cloudflare.CfProperties;

  // Make env available in Next.js/vinext server components
  namespace NodeJS {
    interface ProcessEnv extends Partial<Record<keyof Env, string>> {}
  }
}

// Augment the Request type to include cf properties
declare global {
  interface Request {
    cf?: CfProperties;
  }
}

export {};
