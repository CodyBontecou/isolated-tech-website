/**
 * Client-side OG Image Generation
 * 
 * Generates OG images in the browser using Canvas,
 * which properly supports embedded images (unlike resvg WASM).
 * 
 * Usage: Call from admin panel after icon upload.
 */

interface GenerateOGClientOptions {
  name: string;
  tagline: string | null;
  iconUrl: string | null; // Can be a blob URL or data URL
}

/**
 * Generate OG image as PNG blob in the browser
 */
export async function generateOGPngClient(
  options: GenerateOGClientOptions
): Promise<Blob> {
  const { name, tagline, iconUrl } = options;
  const width = 1200;
  const height = 630;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  // Load icon if provided
  let iconImage: HTMLImageElement | null = null;
  if (iconUrl) {
    try {
      iconImage = await loadImage(iconUrl);
    } catch (e) {
      console.warn("Failed to load icon:", e);
    }
  }

  // Draw icon or placeholder
  const iconX = 80;
  const iconY = (height - 180) / 2;
  const iconSize = 180;
  const iconRadius = 36;

  if (iconImage) {
    // Draw rounded icon
    ctx.save();
    roundedRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
    ctx.clip();
    ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
    ctx.restore();

    // Border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    roundedRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
    ctx.stroke();
  } else {
    // Placeholder
    ctx.fillStyle = "#1a1a1a";
    roundedRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
    ctx.fill();

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    roundedRect(ctx, iconX, iconY, iconSize, iconSize, iconRadius);
    ctx.stroke();

    // Question mark
    ctx.fillStyle = "#666";
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", iconX + iconSize / 2, iconY + iconSize / 2);
  }

  // App name
  const textX = iconX + iconSize + 48;
  ctx.fillStyle = "#f0f0f0";
  ctx.font = "bold 56px 'Roboto Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(name, textX, iconY + 20);

  // Tagline
  if (tagline) {
    ctx.fillStyle = "#666";
    ctx.font = "28px 'Roboto Mono', monospace";
    ctx.fillText(tagline, textX, iconY + 90);
  }

  // Bottom branding
  ctx.fillStyle = "#444";
  ctx.font = "20px 'Roboto Mono', monospace";
  ctx.letterSpacing = "0.1em";
  ctx.fillText("ISOLATED.TECH", 80, height - 48);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/png",
      1.0
    );
  });
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Draw rounded rectangle path
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Upload generated OG image to the server
 */
export async function uploadOGImage(
  appIdOrSlug: string,
  pngBlob: Blob
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", pngBlob, `${appIdOrSlug}-og.png`);

    const response = await fetch(`/api/admin/apps/${appIdOrSlug}/og`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || "Upload failed" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
