import { defineConfig } from "vite";
import vinext from "vinext";
import rsc from "@vitejs/plugin-rsc";
import { cloudflare } from "@cloudflare/vite-plugin";

const isE2E = process.env.ISOLATED_E2E === "1";

export default defineConfig({
  plugins: [
    vinext({ rsc: false }),
    rsc({
      entries: {
        rsc: "virtual:vinext-rsc-entry",
        ssr: "virtual:vinext-app-ssr-entry",
        client: "virtual:vinext-app-browser-entry",
      },
    }),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      configPath: isE2E ? "tests/e2e/wrangler.jsonc" : undefined,
      remoteBindings: !isE2E,
      ...(isE2E ? { persistState: { path: ".wrangler/e2e" } } : {}),
    }),
  ],
  optimizeDeps: {
    include: ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client"],
  },
});
