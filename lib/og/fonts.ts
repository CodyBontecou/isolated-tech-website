/**
 * Font loading for OG image generation with Satori
 * Satori requires TTF or OTF format (not WOFF/WOFF2)
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
 * Load Roboto Mono font for Satori (TTF format required)
 * Using jsDelivr CDN which hosts Google Fonts in TTF format
 */
export async function loadFonts(): Promise<FontConfig[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  // Roboto Mono TTF from jsDelivr (mirrors Google Fonts)
  // Satori requires TTF/OTF, not WOFF/WOFF2
  const robotoMonoRegularUrl =
    "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-400-normal.ttf";
  const robotoMonoBoldUrl =
    "https://cdn.jsdelivr.net/fontsource/fonts/roboto-mono@latest/latin-700-normal.ttf";

  try {
    const [robotoRegular, robotoBold] = await Promise.all([
      fetch(robotoMonoRegularUrl).then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      }),
      fetch(robotoMonoBoldUrl).then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      }),
    ]);

    cachedFonts = [
      {
        name: "Roboto Mono",
        data: robotoRegular,
        weight: 400,
        style: "normal",
      },
      {
        name: "Roboto Mono",
        data: robotoBold,
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
