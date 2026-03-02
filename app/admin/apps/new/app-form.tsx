"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateOGPngClient, uploadOGImage } from "@/lib/og/client-generate";

interface AppFormProps {
  existingApp?: {
    id: string;
    name: string;
    slug: string;
    tagline: string;
    description: string;
    icon_url: string | null;
    screenshots: string[];
    platforms: string[];
    min_price_cents: number;
    suggested_price_cents: number;
    is_published: boolean;
    is_featured: boolean;
    featured_order: number;
    page_config: Record<string, unknown> | null;
    github_url: string;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function AppForm({ existingApp }: AppFormProps) {
  const router = useRouter();
  const isEditing = !!existingApp;

  const [name, setName] = useState(existingApp?.name || "");
  const [slug, setSlug] = useState(existingApp?.slug || "");
  const [tagline, setTagline] = useState(existingApp?.tagline || "");
  const [description, setDescription] = useState(existingApp?.description || "");
  const [iconUrl, setIconUrl] = useState(existingApp?.icon_url || "");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(
    existingApp?.platforms || ["macos"]
  );
  const [minPrice, setMinPrice] = useState(
    existingApp?.min_price_cents
      ? (existingApp.min_price_cents / 100).toString()
      : "0"
  );
  const [suggestedPrice, setSuggestedPrice] = useState(
    existingApp?.suggested_price_cents
      ? (existingApp.suggested_price_cents / 100).toString()
      : ""
  );
  const [isPublished, setIsPublished] = useState(
    existingApp?.is_published ?? false
  );
  const [isFeatured, setIsFeatured] = useState(
    existingApp?.is_featured ?? false
  );
  const [featuredOrder, setFeaturedOrder] = useState(
    existingApp?.featured_order?.toString() ?? "0"
  );
  const [githubUrl, setGithubUrl] = useState(
    existingApp?.github_url || ""
  );

  // iOS App Store URL (from page_config)
  const [iosAppStoreUrl, setIosAppStoreUrl] = useState(
    (existingApp?.page_config as { ios_app_store_url?: string })?.ios_app_store_url || ""
  );
  const [iosAppStoreLabel, setIosAppStoreLabel] = useState(
    (existingApp?.page_config as { ios_app_store_label?: string })?.ios_app_store_label || ""
  );
  const [subscriptionNote, setSubscriptionNote] = useState(
    (existingApp?.page_config as { subscription_note?: string })?.subscription_note || ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = useCallback(
    (newName: string) => {
      setName(newName);
      if (!isEditing) {
        setSlug(slugify(newName));
      }
    },
    [isEditing]
  );

  const togglePlatform = (platform: string) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter((p) => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    if (!tagline.trim()) {
      setError("Tagline is required");
      return;
    }

    if (platforms.length === 0) {
      setError("Select at least one platform");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/admin/apps/${existingApp.id}`
        : "/api/admin/apps";
      const method = isEditing ? "PUT" : "POST";

      // Build page_config object for iOS App Store settings
      // Preserve any existing fields not managed by this form (like app_store_id)
      const pageConfig: Record<string, string> = {};
      const existingConfig = existingApp?.page_config as Record<string, string> | null;
      if (existingConfig?.app_store_id) {
        pageConfig.app_store_id = existingConfig.app_store_id;
      }
      if (iosAppStoreUrl.trim()) {
        pageConfig.ios_app_store_url = iosAppStoreUrl.trim();
      }
      if (iosAppStoreLabel.trim()) {
        pageConfig.ios_app_store_label = iosAppStoreLabel.trim();
      }
      if (subscriptionNote.trim()) {
        pageConfig.subscription_note = subscriptionNote.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          icon_url: iconUrl.trim() || null,
          platforms: platforms.join(","),
          min_price_cents: Math.round(parseFloat(minPrice || "0") * 100),
          suggested_price_cents: suggestedPrice
            ? Math.round(parseFloat(suggestedPrice) * 100)
            : 0,
          is_published: isPublished,
          is_featured: isFeatured,
          featured_order: parseInt(featuredOrder || "0", 10),
          page_config: Object.keys(pageConfig).length > 0 ? pageConfig : null,
          github_url: githubUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save app");
      }

      // Resolve saved app identifier (for uploads)
      const appIdOrSlug = isEditing
        ? existingApp?.id || slug.trim()
        : data.app?.id || slug.trim();

      // #2: If icon file uploaded, upload icon first (and use its URL for OG generation)
      let finalIconUrl = iconUrl.trim() || null;
      if (iconFile) {
        const iconFormData = new FormData();
        iconFormData.append("file", iconFile);

        const iconRes = await fetch(`/api/admin/apps/${appIdOrSlug}/icon`, {
          method: "POST",
          body: iconFormData,
        });

        const iconData = await iconRes.json();
        if (!iconRes.ok) {
          throw new Error(iconData.error || "Failed to upload icon");
        }

        finalIconUrl = iconData.icon_url || finalIconUrl;
      }

      // #1: Auto-generate OG image on save (name/tagline/slug updates)
      // Also runs after icon upload above so OG includes latest icon.
      try {
        const resolvedIconUrl = finalIconUrl
          ? finalIconUrl.startsWith("http")
            ? finalIconUrl
            : `${window.location.origin}${finalIconUrl.startsWith("/") ? "" : "/"}${finalIconUrl}`
          : null;

        const ogPng = await generateOGPngClient({
          name: name.trim(),
          tagline: tagline.trim(),
          iconUrl: resolvedIconUrl,
        });

        const ogResult = await uploadOGImage(appIdOrSlug, ogPng);
        if (!ogResult.success) {
          console.warn("OG auto-generation failed:", ogResult.error);
        }
      } catch (ogError) {
        console.warn("OG auto-generation error:", ogError);
      }

      router.push("/admin/apps?success=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          className="auth-message auth-message--error"
          style={{ marginBottom: "1.5rem" }}
        >
          {error}
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">NAME *</label>
        <input
          type="text"
          className="settings-input"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="My Awesome App"
          maxLength={100}
        />
      </div>

      {/* Slug */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">SLUG *</label>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              color: "var(--gray)",
              marginRight: "0.25rem",
              fontSize: "0.9rem",
            }}
          >
            /apps/
          </span>
          <input
            type="text"
            className="settings-input"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="my-awesome-app"
            maxLength={50}
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
          }}
        >
          URL-safe identifier (auto-generated from name)
        </p>
      </div>

      {/* Tagline */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">TAGLINE *</label>
        <input
          type="text"
          className="settings-input"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="A short, catchy description"
          maxLength={150}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">DESCRIPTION (MARKDOWN)</label>
        <textarea
          className="settings-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Full app description with features, requirements, etc."
          rows={10}
          style={{ resize: "vertical", minHeight: "200px" }}
        />
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
          }}
        >
          Supports markdown formatting
        </p>
      </div>

      {/* Icon URL / Upload */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">ICON URL (OPTIONAL)</label>
        <input
          type="url"
          className="settings-input"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          placeholder="https://example.com/icon.png"
        />

        <label className="settings-label" style={{ marginTop: "0.75rem", display: "block" }}>
          OR UPLOAD ICON (PNG/JPG/WEBP)
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="settings-input"
          onChange={(e) => setIconFile(e.target.files?.[0] || null)}
          style={{ padding: "0.5rem" }}
        />

        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
          }}
        >
          If you upload a file, it will be saved to /apps/{slug}/icon and OG image will auto-regenerate.
        </p>
      </div>

      {/* Platforms */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">PLATFORMS *</label>
        <div style={{ display: "flex", gap: "1rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "crosshair",
            }}
          >
            <input
              type="checkbox"
              checked={platforms.includes("macos")}
              onChange={() => togglePlatform("macos")}
              style={{ width: "1.25rem", height: "1.25rem" }}
            />
            <span>macOS</span>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "crosshair",
            }}
          >
            <input
              type="checkbox"
              checked={platforms.includes("ios")}
              onChange={() => togglePlatform("ios")}
              style={{ width: "1.25rem", height: "1.25rem" }}
            />
            <span>iOS</span>
          </label>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <label className="settings-label">MINIMUM PRICE ($)</label>
          <input
            type="number"
            className="settings-input"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--gray)",
              marginTop: "0.25rem",
            }}
          >
            Set to 0 for &quot;pay what you want&quot;
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <label className="settings-label">SUGGESTED PRICE ($)</label>
          <input
            type="number"
            className="settings-input"
            value={suggestedPrice}
            onChange={(e) => setSuggestedPrice(e.target.value)}
            placeholder="5.00"
            min="0"
            step="0.01"
          />
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--gray)",
              marginTop: "0.25rem",
            }}
          >
            Default price shown to users
          </p>
        </div>
      </div>

      {/* GitHub URL (optional) */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">GITHUB REPO URL (OPTIONAL)</label>
        <input
          type="url"
          className="settings-input"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
        />
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
          }}
        >
          Link to the public repo (if open source)
        </p>
      </div>

      {/* Published */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "crosshair",
          }}
        >
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            style={{ width: "1.25rem", height: "1.25rem" }}
          />
          <span className="settings-label" style={{ marginBottom: 0 }}>
            PUBLISHED
          </span>
        </label>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
            marginLeft: "2rem",
          }}
        >
          Unpublished apps are hidden from the store
        </p>
      </div>

      {/* Featured */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "crosshair",
          }}
        >
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            style={{ width: "1.25rem", height: "1.25rem" }}
          />
          <span className="settings-label" style={{ marginBottom: 0 }}>
            FEATURED ON HOMEPAGE
          </span>
        </label>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
            marginLeft: "2rem",
          }}
        >
          Show this app prominently on the landing page
        </p>
        
        {isFeatured && (
          <div style={{ marginTop: "1rem", marginLeft: "2rem" }}>
            <label className="settings-label">FEATURED ORDER</label>
            <input
              type="number"
              className="settings-input"
              value={featuredOrder}
              onChange={(e) => setFeaturedOrder(e.target.value)}
              placeholder="0"
              min="0"
              style={{ width: "100px" }}
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--gray)",
                marginTop: "0.25rem",
              }}
            >
              Lower numbers appear first (0 = hero spotlight)
            </p>
          </div>
        )}
      </div>

      {/* iOS App Store Link (shown when iOS platform selected) */}
      {platforms.includes("ios") && (
        <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
          <label className="settings-label" style={{ marginBottom: "1rem", display: "block" }}>
            iOS APP STORE
          </label>

          <div style={{ marginBottom: "1rem" }}>
            <label className="settings-label">APP STORE URL</label>
            <input
              type="url"
              className="settings-input"
              value={iosAppStoreUrl}
              onChange={(e) => setIosAppStoreUrl(e.target.value)}
              placeholder="https://apps.apple.com/app/..."
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--gray)",
                marginTop: "0.25rem",
              }}
            >
              Link to the iOS app on the App Store
            </p>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="settings-label">BUTTON LABEL (OPTIONAL)</label>
            <input
              type="text"
              className="settings-input"
              value={iosAppStoreLabel}
              onChange={(e) => setIosAppStoreLabel(e.target.value)}
              placeholder="DOWNLOAD ON APP STORE (iOS)"
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--gray)",
                marginTop: "0.25rem",
              }}
            >
              Custom button text (default: &quot;DOWNLOAD ON APP STORE (iOS)&quot;)
            </p>
          </div>

          <div>
            <label className="settings-label">SUBSCRIPTION NOTE (OPTIONAL)</label>
            <input
              type="text"
              className="settings-input"
              value={subscriptionNote}
              onChange={(e) => setSubscriptionNote(e.target.value)}
              placeholder="Manage your subscription in the iOS app"
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--gray)",
                marginTop: "0.25rem",
              }}
            >
              Note to display about subscription management (for apps with in-app subscriptions)
            </p>
          </div>
        </div>
      )}



      {/* Submit */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          className="auth-btn"
          disabled={isSubmitting}
          style={{ width: "auto" }}
        >
          {isSubmitting ? "SAVING..." : isEditing ? "UPDATE APP" : "CREATE APP"}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          style={{ width: "auto" }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
