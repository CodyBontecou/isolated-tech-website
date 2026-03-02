/**
 * Dynamic OG Image Generation
 * GET /api/og/[slug] - Returns PNG image for app pages
 *
 * Strategy:
 * 1. Check R2 for pre-generated PNG (uploaded via admin panel)
 * 2. Fall back to dynamic generation with Satori + resvg
 * 
 * Note: Dynamic generation shows placeholder instead of icon
 * due to resvg WASM limitation with embedded images.
 * For icons, use the admin panel to generate OG images client-side.
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

    // 1. Try to serve pre-generated PNG from R2
    if (env?.APPS_BUCKET) {
      const r2Key = `og/${slug}.png`;
      const ogObject = await env.APPS_BUCKET.get(r2Key);

      if (ogObject) {
        return new Response(ogObject.body, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "CDN-Cache-Control": "public, max-age=604800",
            "X-OG-Source": "r2",
          },
        });
      }
    }

    // 2. Fall back to dynamic generation
    const fonts = await loadFonts();

    // Generate SVG (without icon - resvg can't render embedded images)
    const svg = await satori(
      OGImageTemplate({
        name: app.name,
        tagline: app.tagline,
        iconUrl: null, // Skip icon for dynamic generation
      }),
      {
        width: 1200,
        height: 630,
        fonts,
      }
    );

    // Debug mode: return raw SVG
    if (url.searchParams.get("debug") === "svg") {
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store",
          "X-OG-Source": "dynamic-svg",
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
            "Cache-Control": "public, max-age=3600, s-maxage=3600", // Shorter cache for dynamic
            "X-OG-Source": "dynamic-png",
          },
        });
      } catch (pngError) {
        console.warn("PNG generation failed:", pngError);
      }
    }

    // Final fallback: return SVG
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "X-OG-Source": "fallback-svg",
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
