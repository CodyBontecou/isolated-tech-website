/**
 * OG Image Template for app pages
 * Used by Satori to generate SVG, then rendered to PNG
 *
 * Note: Satori uses its own JSX implementation, not React's.
 * The JSX here is converted directly to Satori's object format.
 */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Satori JSX doesn't need React types

interface OGImageProps {
  name: string;
  tagline?: string | null;
  iconUrl?: string | null;
}

/**
 * OG Image component for app pages
 * 1200x630px - standard OG image size
 * Dark theme matching site aesthetic
 */
export function OGImageTemplate({ name, tagline, iconUrl }: OGImageProps) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        fontFamily: "Space Mono",
        position: "relative",
      }}
    >
      {/* Main content area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
        }}
      >
        {/* App icon */}
        {iconUrl ? (
          <img
            src={iconUrl}
            width={180}
            height={180}
            style={{
              borderRadius: 36,
              border: "2px solid #333",
            }}
          />
        ) : (
          // Placeholder when no icon
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 36,
              background: "#1a1a1a",
              border: "2px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              color: "#666",
            }}
          >
            ?
          </div>
        )}

        {/* Text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {/* App name */}
          <div
            style={{
              color: "#f0f0f0",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </div>

          {/* Tagline */}
          {tagline && (
            <div
              style={{
                color: "#666",
                fontSize: 28,
                marginTop: 16,
                lineHeight: 1.4,
              }}
            >
              {tagline}
            </div>
          )}
        </div>
      </div>

      {/* Bottom branding */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            color: "#444",
            fontSize: 20,
            letterSpacing: "0.1em",
          }}
        >
          ISOLATED.TECH
        </div>
      </div>

      {/* Decorative corner accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: "linear-gradient(135deg, #f0f0f0 0%, transparent 50%)",
          opacity: 0.03,
        }}
      />
    </div>
  );
}

/**
 * Generic OG template for non-app pages
 */
interface GenericOGProps {
  title: string;
  subtitle?: string;
}

export function GenericOGTemplate({ title, subtitle }: GenericOGProps) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        fontFamily: "Space Mono",
        position: "relative",
      }}
    >
      {/* Title */}
      <div
        style={{
          color: "#f0f0f0",
          fontSize: 64,
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            color: "#666",
            fontSize: 28,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Bottom branding */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          color: "#444",
          fontSize: 20,
          letterSpacing: "0.1em",
        }}
      >
        ISOLATED.TECH
      </div>
    </div>
  );
}
