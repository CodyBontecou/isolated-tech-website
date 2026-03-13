"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BlogPostFormProps {
  apps: { id: string; name: string; slug: string }[];
  post?: {
    id: string;
    app_id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    body: string;
    cover_image_url: string | null;
    author_name: string | null;
    is_published: number;
    published_at: string | null;
  };
}

export function BlogPostForm({ apps, post }: BlogPostFormProps) {
  const router = useRouter();
  const isEditing = !!post;

  const [appId, setAppId] = useState(post?.app_id || "");
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [body, setBody] = useState(post?.body || "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url || "");
  const [authorName, setAuthorName] = useState(post?.author_name || "");
  const [isPublished, setIsPublished] = useState(post?.is_published === 1);
  const [publishedAt, setPublishedAt] = useState(
    post?.published_at ? post.published_at.slice(0, 16) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedApp = apps.find((a) => a.id === appId);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing && !slug) {
      setSlug(generateSlug(value));
    }
  };

  const getUrlPreview = () => {
    if (!selectedApp) return "(select an app)";
    return `/apps/${selectedApp.slug}/blog/${slug || "..."}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = isEditing ? `/api/admin/blog-posts/${post.id}` : "/api/admin/blog-posts";

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || null,
          body: body.trim(),
          coverImageUrl: coverImageUrl.trim() || null,
          authorName: authorName.trim() || null,
          isPublished,
          publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }

      router.push("/admin/blog-posts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "700px" }}>
      <div style={{ background: "var(--gray-dark)", border: "1px solid #333", padding: "1.5rem" }}>
        {/* App Selection */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            APP <span style={{ color: "#f87171" }}>*</span>
          </label>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
            }}
          >
            <option value="">Select an app...</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            TITLE <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="e.g., Introducing Health Insights"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
            }}
          />
        </div>

        {/* Slug */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            SLUG <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            required
            pattern="[a-z0-9-]+"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
            }}
          />
          <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "#666" }}>
            URL: <span style={{ color: "#888" }}>{getUrlPreview()}</span>
          </div>
        </div>

        {/* Excerpt */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            EXCERPT
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder="Short description for previews and meta tags..."
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
              resize: "vertical",
            }}
          />
        </div>

        {/* Cover Image URL */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            COVER IMAGE URL
          </label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
            }}
          />
        </div>

        {/* Author Name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            AUTHOR NAME
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g., Cody Bontecou"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
            }}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.5rem",
            }}
          >
            CONTENT (MARKDOWN) <span style={{ color: "#f87171" }}>*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={20}
            placeholder="Write your blog post content here. Markdown is supported."
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
              background: "#0a0a0a",
              border: "1px solid #333",
              color: "#f0f0f0",
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Published At & Published Checkbox */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "2rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.65rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "#888",
                marginBottom: "0.5rem",
              }}
            >
              PUBLISH DATE
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              style={{
                padding: "0.75rem",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: "#0a0a0a",
                border: "1px solid #333",
                color: "#f0f0f0",
              }}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              paddingBottom: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span style={{ fontSize: "0.85rem" }}>Published</span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              fontSize: "0.8rem",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => router.push("/admin/blog-posts")}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              background: "transparent",
              border: "1px solid #333",
              color: "#888",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              background: "#f0f0f0",
              border: "none",
              color: "#0a0a0a",
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? "SAVING..." : isEditing ? "SAVE CHANGES" : "CREATE POST"}
          </button>
        </div>
      </div>
    </form>
  );
}
