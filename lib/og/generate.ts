/**
 * OG Image Generation and Storage
 * 
 * Generates OG images and stores them in R2.
 * Called when apps are created/updated or icons are uploaded.
 */

import satori from "satori";
import { OGImageTemplate } from "./template";
import { loadFonts } from "./fonts";

interface GenerateOGOptions {
  slug: string;
  name: string;
  tagline: string | null;
  iconPngBuffer?: ArrayBuffer | null;
  bucket: R2Bucket;
}

/**
 * Convert ArrayBuffer to base64 data URL
 */
function bufferToDataUrl(buffer: ArrayBuffer, contentType = "image/png"): string {
  const uint8Array = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

/**
 * Generate OG image SVG
 */
export async function generateOGSvg(options: {
  name: string;
  tagline: string | null;
  iconDataUrl: string | null;
}): Promise<string> {
  const fonts = await loadFonts();

  return satori(
    OGImageTemplate({
      name: options.name,
      tagline: options.tagline,
      iconUrl: options.iconDataUrl,
    }),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );
}

/**
 * Generate and store OG image in R2
 * 
 * Note: Due to resvg WASM limitations, we store the SVG.
 * A separate process can convert to PNG if needed.
 */
export async function generateAndStoreOG(options: GenerateOGOptions): Promise<{
  success: boolean;
  svgKey: string;
  error?: string;
}> {
  const { slug, name, tagline, iconPngBuffer, bucket } = options;
  const svgKey = `og/${slug}.svg`;

  try {
    // Convert icon to data URL if provided
    const iconDataUrl = iconPngBuffer 
      ? bufferToDataUrl(iconPngBuffer) 
      : null;

    // Generate SVG
    const svg = await generateOGSvg({
      name,
      tagline,
      iconDataUrl,
    });

    // Store SVG in R2
    await bucket.put(svgKey, svg, {
      httpMetadata: {
        contentType: "image/svg+xml",
        cacheControl: "public, max-age=31536000", // 1 year (versioned by content)
      },
    });

    console.log(`OG: Generated and stored SVG for ${slug}`);

    return { success: true, svgKey };
  } catch (error) {
    console.error(`OG: Failed to generate for ${slug}:`, error);
    return {
      success: false,
      svgKey,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete OG image from R2
 */
export async function deleteOG(slug: string, bucket: R2Bucket): Promise<void> {
  const svgKey = `og/${slug}.svg`;
  await bucket.delete(svgKey);
  console.log(`OG: Deleted SVG for ${slug}`);
}

/**
 * Check if OG image exists in R2
 */
export async function hasOG(slug: string, bucket: R2Bucket): Promise<boolean> {
  const svgKey = `og/${slug}.svg`;
  const head = await bucket.head(svgKey);
  return head !== null;
}
