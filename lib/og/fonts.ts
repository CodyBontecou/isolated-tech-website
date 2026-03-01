/**
 * Font loading for OG image generation with Satori
 * Fetches Space Mono from Google Fonts CDN
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
 * Load Space Mono font for Satori
 * Uses Google Fonts CDN, caches in memory
 */
export async function loadFonts(): Promise<FontConfig[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  // Space Mono Regular (400)
  const spaceMonoRegular = await fetch(
    "https://fonts.gstatic.com/s/spacemono/v12/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff"
  ).then((res) => res.arrayBuffer());

  // Space Mono Bold (700)
  const spaceMonoBold = await fetch(
    "https://fonts.gstatic.com/s/spacemono/v12/i7dMIFZifjKcF5UAWdDRaPpZUFWaHg.woff"
  ).then((res) => res.arrayBuffer());

  cachedFonts = [
    {
      name: "Space Mono",
      data: spaceMonoRegular,
      weight: 400,
      style: "normal",
    },
    {
      name: "Space Mono",
      data: spaceMonoBold,
      weight: 700,
      style: "normal",
    },
  ];

  return cachedFonts;
}
