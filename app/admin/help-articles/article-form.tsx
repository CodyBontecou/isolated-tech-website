"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ArticleFormProps {
  apps: { id: string; name: string; slug: string }[];
  article?: {
    id: string;
    app_id: string | null;
    slug: string;
    title: string;
    body: string;
    category: string;
    sort_order: number;
    is_published: number;
    article_type: string;
    question: string | null;
  };
}

const ARTICLE_TYPES = [
  { value: "help", label: "Help Article", description: "General help center" },
  { value: "docs", label: "Documentation", description: "App documentation" },
  { value: "faq", label: "FAQ", description: "Frequently asked questions" },
  { value: "guide", label: "Guide", description: "Tutorials & guides" },
];

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "getting-started", label: "Getting Started" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "billing", label: "Billing & Payments" },
  { value: "features", label: "Features" },
  { value: "integration", label: "Integration" },
];

export function ArticleForm({ apps, article }: ArticleFormProps) {
  const router = useRouter();
  const isEditing = !!article;

  const [articleType, setArticleType] = useState(article?.article_type || "help");
  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [body, setBody] = useState(article?.body || "");
  const [category, setCategory] = useState(article?.category || "general");
  const [appId, setAppId] = useState(article?.app_id || "");
  const [question, setQuestion] = useState(article?.question || "");
  const [sortOrder, setSortOrder] = useState(article?.sort_order || 0);
  const [isPublished, setIsPublished] = useState(article?.is_published === 1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedApp = apps.find((a) => a.id === appId);

  // Generate URL preview based on type
  const getUrlPreview = () => {
    if (articleType === "help") {
      return `/help/${slug}`;
    }
    if (!selectedApp) return `(select an app)`;
    if (articleType === "docs") {
      return `/apps/${selectedApp.slug}/docs/${slug}`;
    }
    if (articleType === "faq") {
      return `/apps/${selectedApp.slug}/faq#${slug}`;
    }
    if (articleType === "guide") {
      return `/apps/${selectedApp.slug}/guides/${slug}`;
    }
    return `/${slug}`;
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/admin/help-articles/${article.id}`
        : "/api/admin/help-articles";

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleType,
          title: title.trim(),
          slug: slug.trim(),
          body: body.trim(),
          category,
          appId: appId || null,
          question: question.trim() || null,
          sortOrder,
          isPublished,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }

      router.push("/admin/help-articles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "700px" }}>
      <div style={{ background: "var(--gray-dark)", border: "1px solid #333", padding: "1.5rem" }}>
        {/* Article Type */}
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
            TYPE
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {ARTICLE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setArticleType(type.value)}
                style={{
                  padding: "0.75rem 0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  background: articleType === type.value ? "#f0f0f0" : "#0a0a0a",
                  color: articleType === type.value ? "#0a0a0a" : "#888",
                  border: articleType === type.value ? "1px solid #f0f0f0" : "1px solid #333",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {type.label.toUpperCase()}
              </button>
            ))}
          </div>
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
            TITLE
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
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
            SLUG
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

        {/* Category & App */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
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
              CATEGORY
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

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
              APP {articleType !== "help" && <span style={{ color: "#f87171" }}>*</span>}
            </label>
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              required={articleType !== "help"}
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
              <option value="">{articleType === "help" ? "General (no specific app)" : "Select an app..."}</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question (FAQ only) */}
        {articleType === "faq" && (
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
              QUESTION (COLLAPSED STATE)
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., How do I reset my password?"
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
            <div style={{ marginTop: "0.35rem", fontSize: "0.7rem", color: "#666" }}>
              If empty, the title will be used as the question.
            </div>
          </div>
        )}

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
            CONTENT (MARKDOWN)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={15}
            placeholder="Write your help article content here. Markdown is supported."
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

        {/* Sort Order & Published */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginBottom: "1.25rem" }}>
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
              SORT ORDER
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              min={0}
              style={{
                width: "80px",
                padding: "0.75rem",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: "#0a0a0a",
                border: "1px solid #333",
                color: "#f0f0f0",
              }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
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
            onClick={() => router.push("/admin/help-articles")}
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
            {isSaving ? "SAVING..." : isEditing ? "SAVE CHANGES" : "CREATE ARTICLE"}
          </button>
        </div>
      </div>
    </form>
  );
}
