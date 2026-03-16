import path from "node:path";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const CLIENT_WORK_FILE = path.resolve(process.cwd(), "lib/client-work.ts");
const viewport = { width: 1600, height: 1000 };

function parseClientWorkArray(source) {
  const match = source.match(/export const CLIENT_WORK(?:\s*:\s*[^=]+)?\s*=\s*(\[[\s\S]*?\]);/);

  if (!match) {
    throw new Error(`Could not find CLIENT_WORK export in ${CLIENT_WORK_FILE}`);
  }

  const arrayLiteral = match[1].replace(/;\s*$/, "");
  const parsed = vm.runInNewContext(`(${arrayLiteral})`, {}, { timeout: 1000 });

  if (!Array.isArray(parsed)) {
    throw new Error("Parsed CLIENT_WORK is not an array");
  }

  return parsed;
}

function toOutputPath(previewImage) {
  if (typeof previewImage !== "string" || !previewImage.startsWith("/")) {
    return null;
  }

  return path.resolve(process.cwd(), "public", previewImage.slice(1));
}

function buildTargets(clientWork) {
  const deduped = new Map();

  const addTarget = (name, url, previewImage) => {
    const output = toOutputPath(previewImage);

    if (!url || !output) {
      return;
    }

    if (deduped.has(output)) {
      const existing = deduped.get(output);
      if (existing.url !== url) {
        console.warn(
          `⚠️  Duplicate output with different URL (${output})\n   keeping: ${existing.url}\n   skipping: ${url}`
        );
      }
      return;
    }

    deduped.set(output, { name, url, output });
  };

  for (const project of clientWork) {
    addTarget(project.slug, project.primaryUrl, project.previewImage);

    if (project.before) {
      addTarget(`${project.slug}-before`, project.before.url, project.before.previewImage);
    }

    if (project.after) {
      addTarget(`${project.slug}-after`, project.after.url, project.after.previewImage);
    }
  }

  return [...deduped.values()];
}

async function capture() {
  const source = await readFile(CLIENT_WORK_FILE, "utf8");
  const clientWork = parseClientWorkArray(source);
  const targets = buildTargets(clientWork);

  if (targets.length === 0) {
    console.log("No local screenshot targets found in lib/client-work.ts");
    return;
  }

  console.log(`Found ${targets.length} screenshot target(s) from lib/client-work.ts`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  for (const target of targets) {
    const extension = path.extname(target.output).toLowerCase();
    const isPng = extension === ".png";

    console.log(`→ Capturing ${target.name} (${target.url})`);
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2500);

    await page.screenshot({
      path: target.output,
      type: isPng ? "png" : "jpeg",
      ...(isPng ? {} : { quality: 85 }),
      fullPage: false
    });

    console.log(`  Saved ${path.relative(process.cwd(), target.output)}`);
  }

  await browser.close();
}

capture().catch((error) => {
  console.error("Screenshot capture failed:", error);
  process.exit(1);
});
