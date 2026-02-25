/// <reference types="@cloudflare/workers-types" />

import type { Env } from "./lib/env";

declare global {
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
