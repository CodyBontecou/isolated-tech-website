/**
 * Font loading for OG image generation with Satori
 * Fetches Inter from Google Fonts CDN (more reliable than Space Mono)
 */

interface FontConfig {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal" | "italic";
}

// Cache fonts in memory to avoid refetching
let cachedFonts: FontConfig[] | null = null;

/**
 * Load Inter font for Satori
 * Uses Google Fonts CDN with proper headers, caches in memory
 * Falls back to fetching without headers if needed
 */
export async function loadFonts(): Promise<FontConfig[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  // Use Inter font (widely used, reliable CDN)
  // These are direct WOFF2 URLs from Google Fonts
  const interRegularUrl =
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2";
  const interBoldUrl =
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2";

  try {
    const [interRegular, interBold] = await Promise.all([
      fetch(interRegularUrl).then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      }),
      fetch(interBoldUrl).then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      }),
    ]);

    cachedFonts = [
      {
        name: "Inter",
        data: interRegular,
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: interBold,
        weight: 700,
        style: "normal",
      },
    ];

    return cachedFonts;
  } catch (error) {
    console.error("Failed to load fonts:", error);
    throw error;
  }
}
