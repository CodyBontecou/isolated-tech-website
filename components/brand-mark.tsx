interface BrandMarkProps {
  size?: number;
}

/**
 * The isolated.tech mark: a tall slab on a rounded tile, matching the favicon.
 * Tile uses the foreground color and the slab the background, so it inverts with the theme.
 */
export function BrandMark({ size = 20 }: BrandMarkProps) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="20" height="20" rx="4.5" fill="currentColor" />
      <rect x="8.1" y="3.6" width="3.8" height="12.8" rx="0.5" fill="var(--black)" />
    </svg>
  );
}

/** Crosshair marker drawn at the corners of framed sections. */
export function PlusMark({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={`plus plus--${corner}`} viewBox="0 0 15 15" aria-hidden="true" focusable="false">
      <path d="M7.5 0v15M0 7.5h15" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
