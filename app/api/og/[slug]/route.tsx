/**
 * Dynamic OG Image Generation
 * GET /api/og/[slug] - Returns PNG image for app pages
 *
 * Uses Satori (React → SVG) + @cf-wasm/resvg (SVG → PNG)
 * 
 * KNOWN LIMITATION: resvg WASM cannot render embedded data URL images.
 * The SVG contains the icon correctly (viewable with ?debug=svg),
 * but the PNG output shows a placeholder. This is a resvg limitation.
 * 
 * Future fix: Pre-generate OG images when apps are updated, store in R2.
 */

import satori from "satori";
import { getEnv } from "@/lib/cloudflare-context";
import { getAppBySlug } from "@/lib/app-data";
import { loadFonts } from "@/lib/og/fonts";
import { OGImageTemplate } from "@/lib/og/template";

// Dynamic import for resvg
let Resvg: typeof import("@cf-wasm/resvg/workerd").Resvg | null = null;

async function getResvg() {
  if (Resvg) return Resvg;
  try {
    const module = await import("@cf-wasm/resvg/workerd");
    Resvg = module.Resvg;
    return Resvg;
  } catch (error) {
    console.warn("Failed to load resvg WASM:", error);
    return null;
  }
}

/**
 * Fetch icon from R2 and convert to data URL
 * Note: This works for SVG output but resvg can't render it in PNG
 */
async function getIconDataUrl(
  slug: string,
  bucket: R2Bucket | undefined
): Promise<string | null> {
  if (!bucket) return null;

  try {
    const r2Key = `apps/${slug}/icon.png`;
    const iconObject = await bucket.get(r2Key);

    if (!iconObject) return null;

    const iconBuffer = await iconObject.arrayBuffer();
    const contentType = iconObject.httpMetadata?.contentType || "image/png";

    // Convert to base64
    const uint8Array = new Uint8Array(iconBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn("Failed to fetch icon:", error);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const env = getEnv();
    const url = new URL(request.url);

    // Fetch app data
    const app = await getAppBySlug(slug, env?.DB);
    if (!app) {
      return new Response("App not found", { status: 404 });
    }

    // Load fonts
    const fonts = await loadFonts();

    // Fetch icon (works in SVG, not in PNG due to resvg limitation)
    const iconDataUrl = await getIconDataUrl(slug, env?.APPS_BUCKET);

    // Generate SVG with Satori
    const svg = await satori(
      OGImageTemplate({
        name: app.name,
        tagline: app.tagline,
        iconUrl: iconDataUrl,
      }),
      {
        width: 1200,
        height: 630,
        fonts,
      }
    );

    // Debug mode: return raw SVG (shows icon correctly)
    if (url.searchParams.get("debug") === "svg") {
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store",
        },
      });
    }

    // Convert to PNG with resvg
    const ResvgClass = await getResvg();

    if (ResvgClass) {
      try {
        const resvg = new ResvgClass(svg, {
          fitTo: { mode: "width", value: 1200 },
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        return new Response(pngBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "CDN-Cache-Control": "public, max-age=604800",
          },
        });
      } catch (pngError) {
        console.warn("PNG generation failed:", pngError);
      }
    }

    // Fallback: return SVG
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("OG image generation error:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      { status: 500 }
    );
  }
}
