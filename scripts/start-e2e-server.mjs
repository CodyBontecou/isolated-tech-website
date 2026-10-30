import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// A distinct config and local persistence directory keep E2E data out of production.
const cwd = fileURLToPath(new URL("..", import.meta.url));
rmSync(new URL("../.wrangler/e2e", import.meta.url), { recursive: true, force: true });
const env = { ...process.env, ISOLATED_E2E: "1", WRANGLER_SEND_METRICS: "false" };
function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} exited with ${signal ?? code}`));
    });
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  });
}

await run("node_modules/wrangler/bin/wrangler.js", [
  "d1", "migrations", "apply", "isolated-tech-e2e", "--local",
  "--config", "tests/e2e/wrangler.jsonc", "--persist-to", ".wrangler/e2e",
]);
await run("node_modules/vinext/dist/cli.js", ["dev", "--port", "3000", "--hostname", "localhost"]);
