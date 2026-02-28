/**
 * Platform utilities for iOS/macOS app store
 */

export type Platform = "ios" | "macos" | "web";

/**
 * Parse platforms JSON string to array.
 * Handles: JSON arrays ["ios"], plain strings "ios", comma-separated "ios,macos"
 */
export function getPlatforms(platformsJson: string): Platform[] {
  if (!platformsJson) return [];

  // Try JSON array first
  try {
    const parsed = JSON.parse(platformsJson);
    if (Array.isArray(parsed)) return parsed as Platform[];
    // Single value in JSON like "ios" parses to string
    if (typeof parsed === "string") return [parsed as Platform];
  } catch {
    // Not valid JSON - treat as plain string
  }

  // Handle plain string: "ios" or comma-separated "ios,macos"
  return platformsJson
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean) as Platform[];
}

/**
 * Check if platforms include iOS
 */
export function hasIOS(platforms: Platform[]): boolean {
  return platforms.includes("ios");
}

/**
 * Check if platforms include macOS
 */
export function hasMacOS(platforms: Platform[]): boolean {
  return platforms.includes("macos");
}

/**
 * Check if app is iOS-only (has iOS but not macOS)
 */
export function isIOSOnly(platforms: Platform[]): boolean {
  return hasIOS(platforms) && !hasMacOS(platforms);
}

/**
 * Check if app is macOS-only (has macOS but not iOS)
 */
export function isMacOSOnly(platforms: Platform[]): boolean {
  return hasMacOS(platforms) && !hasIOS(platforms);
}

/**
 * Check if app supports both iOS and macOS
 */
export function hasBothPlatforms(platforms: Platform[]): boolean {
  return hasIOS(platforms) && hasMacOS(platforms);
}

/**
 * Get human-readable label for a platform
 */
export function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case "ios":
      return "iOS";
    case "macos":
      return "macOS";
    case "web":
      return "Web";
    default:
      return (platform as string).toUpperCase();
  }
}
