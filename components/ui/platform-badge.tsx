import { getPlatformLabel, type Platform } from "@/lib/platform";

interface PlatformBadgeProps {
  platform: Platform | string;
}

/**
 * Badge component showing a platform name (iOS, macOS, Web)
 */
export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <span className="store-badge">
      {getPlatformLabel(platform as Platform)}
    </span>
  );
}
