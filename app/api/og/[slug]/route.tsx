/**
 * Dynamic OG Image Generation
 * GET /api/og/[slug] - Returns PNG image for app pages
 *
 * Uses Satori (React → SVG) + @cf-wasm/resvg (SVG → PNG)
 * Compatible with Cloudflare Workers
 * 
 * Note: In local dev (workerd), WASM may not initialize properly.
 * The route will return an SVG fallback in that case.
 */

import satori from "satori";
import { getEnv } from "@/lib/cloudflare-context";
import { getAppBySlug } from "@/lib/app-data";
import { loadFonts } from "@/lib/og/fonts";
import { OGImageTemplate } from "@/lib/og/template";

// Dynamic import for resvg to handle WASM initialization issues
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

    // Fetch app data
    const app = await getAppBySlug(slug, env?.DB);

    if (!app) {
      return new Response("App not found", { status: 404 });
    }

    // Load fonts
    const fonts = await loadFonts();

    // Fetch icon directly from R2 and convert to data URL
    // (Can't fetch from same Worker due to loopback restriction)
    let iconDataUrl: string | null = null;
    
    if (env?.APPS_BUCKET) {
      try {
        const r2Key = `apps/${slug}/icon.png`;
        console.log(`OG: Fetching icon from R2 key: ${r2Key}`);
        const iconObject = await env.APPS_BUCKET.get(r2Key);
        
        if (iconObject) {
          console.log(`OG: Icon found, size: ${iconObject.size}`);
          const iconBuffer = await iconObject.arrayBuffer();
          const contentType = iconObject.httpMetadata?.contentType || "image/png";
          const base64 = btoa(
            new Uint8Array(iconBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          iconDataUrl = `data:${contentType};base64,${base64}`;
          console.log(`OG: Icon converted to data URL, length: ${iconDataUrl.length}`);
        } else {
          console.log(`OG: Icon not found in R2 at ${r2Key}`);
        }
      } catch (iconError) {
        console.error("OG: Failed to fetch icon from R2:", iconError);
      }
    } else {
      console.log("OG: APPS_BUCKET not available");
    }

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

    // Try to convert to PNG with resvg
    const ResvgClass = await getResvg();
    
    if (ResvgClass) {
      try {
        const resvg = new ResvgClass(svg, {
          fitTo: {
            mode: "width",
            value: 1200,
          },
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
        console.warn("PNG generation failed, falling back to SVG:", pngError);
      }
    }

    // Fallback: return SVG (works in local dev where WASM fails)
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("OG image generation error:", error);
    return new Response(
      `Error generating image: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
