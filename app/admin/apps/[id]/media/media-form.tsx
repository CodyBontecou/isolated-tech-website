"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MediaItem {
  id: string;
  type: "image" | "youtube";
  url: string;
  title: string | null;
  sort_order: number;
}

interface MediaFormProps {
  appId: string;
  initialMedia: MediaItem[];
}

export function MediaForm({ appId, initialMedia }: MediaFormProps) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<"image" | "youtube">("image");
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!newUrl.trim()) {
      setError("URL is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/apps/${appId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          url: newUrl.trim(),
          title: newTitle.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add media");
      }

      const newMedia = await res.json();
      setMedia([...media, newMedia]);
      setNewUrl("");
      setNewTitle("");
      setIsAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add media");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this media item?")) return;

    try {
      const res = await fetch(`/api/admin/apps/${appId}/media/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      setMedia(media.filter((m) => m.id !== id));
      router.refresh();
    } catch (err) {
      alert("Failed to delete media");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = media.findIndex((m) => m.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === media.length - 1) return;

    const newMedia = [...media];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newMedia[idx], newMedia[swapIdx]] = [newMedia[swapIdx], newMedia[idx]];
    
    // Update sort_order values
    const reordered = newMedia.map((m, i) => ({ ...m, sort_order: i }));
    setMedia(reordered);

    // Save new order to server
    try {
      await fetch(`/api/admin/apps/${appId}/media/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((m) => m.id) }),
      });
    } catch (err) {
      console.error("Failed to save order");
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">MEDIA ITEMS</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="auth-btn"
            style={{ width: "auto" }}
          >
            + ADD MEDIA
          </button>
        )}
      </div>

      {isAdding && (
        <div
          style={{
            background: "var(--gray-dark)",
            border: "var(--border)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label className="auth-label">TYPE</label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="type"
                  checked={newType === "image"}
                  onChange={() => setNewType("image")}
                />
                <span>Image</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="type"
                  checked={newType === "youtube"}
                  onChange={() => setNewType("youtube")}
                />
                <span>YouTube</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="auth-label">
              {newType === "youtube" ? "YOUTUBE VIDEO ID" : "IMAGE URL"}
            </label>
            <input
              type="text"
              className="auth-input"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder={
                newType === "youtube"
                  ? "e.g., dQw4w9WgXcQ"
                  : "https://example.com/image.jpg"
              }
            />
            {newType === "youtube" && (
              <p style={{ fontSize: "0.7rem", color: "var(--gray)", marginTop: "0.25rem" }}>
                The video ID is the part after &quot;v=&quot; in the YouTube URL
              </p>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="auth-label">CAPTION (OPTIONAL)</label>
            <input
              type="text"
              className="auth-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "1rem" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="auth-btn"
              style={{ width: "auto" }}
            >
              {loading ? "ADDING..." : "ADD"}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewUrl("");
                setNewTitle("");
                setError("");
              }}
              className="auth-btn auth-btn--outline"
              style={{ width: "auto" }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {media.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            background: "var(--gray-dark)",
            border: "var(--border)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--gray)" }}>No media items yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {media.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr auto",
                gap: "1rem",
                alignItems: "center",
                background: "var(--gray-dark)",
                border: "var(--border)",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "60px",
                  background: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {item.type === "youtube" ? (
                  <img
                    src={`https://img.youtube.com/vi/${item.url}/mqdefault.jpg`}
                    alt="Video thumbnail"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.title || "Media"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.1em",
                      padding: "0.2rem 0.4rem",
                      background: item.type === "youtube" ? "#f87171" : "#60a5fa",
                      color: "var(--black)",
                      fontWeight: 700,
                    }}
                  >
                    {item.type.toUpperCase()}
                  </span>
                  {item.title && (
                    <span style={{ color: "var(--white)", fontSize: "0.85rem" }}>
                      {item.title}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--gray)",
                    marginTop: "0.25rem",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.url}
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button
                  onClick={() => handleReorder(item.id, "up")}
                  disabled={idx === 0}
                  className="admin-table__btn"
                  style={{ opacity: idx === 0 ? 0.3 : 1 }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleReorder(item.id, "down")}
                  disabled={idx === media.length - 1}
                  className="admin-table__btn"
                  style={{ opacity: idx === media.length - 1 ? 0.3 : 1 }}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="admin-table__btn admin-table__btn--danger"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
