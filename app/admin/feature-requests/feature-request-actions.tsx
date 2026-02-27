"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  currentStatus: "open" | "planned" | "in_progress" | "completed" | "closed";
  currentPriority: number;
  currentResponse: string | null;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "#3b82f6" },
  { value: "planned", label: "Planned", color: "#f59e0b" },
  { value: "in_progress", label: "In Progress", color: "#8b5cf6" },
  { value: "completed", label: "Completed", color: "#22c55e" },
  { value: "closed", label: "Closed", color: "#6b7280" },
];

export function FeatureRequestActions({ id, currentStatus, currentPriority, currentResponse }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [response, setResponse] = useState(currentResponse || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/feature-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          adminResponse: response || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      setMessage({ type: "success", text: "Saved!" });
      router.refresh();
      setTimeout(() => setIsOpen(false), 1000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="admin-table__btn">
        EDIT
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem",
            borderBottom: "1px solid #333",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
            Edit Feature Request
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {/* Status */}
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
              STATUS
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value as typeof status)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    background: status === option.value ? `${option.color}20` : "transparent",
                    border: `1px solid ${status === option.value ? option.color : "#333"}`,
                    color: status === option.value ? option.color : "#888",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {option.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
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
              PRIORITY (higher = more important)
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              style={{
                width: "100px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: "#0a0a0a",
                border: "1px solid #333",
                color: "#f0f0f0",
              }}
            />
          </div>

          {/* Admin Response */}
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
              OFFICIAL RESPONSE (visible to users)
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Add a public response explaining status, timeline, or next steps..."
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: "#0a0a0a",
                border: "1px solid #333",
                color: "#f0f0f0",
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Message */}
          {message && (
            <div
              style={{
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.8rem",
                background:
                  message.type === "success"
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(248, 113, 113, 0.1)",
                border: `1px solid ${message.type === "success" ? "#22c55e30" : "#f8717130"}`,
                color: message.type === "success" ? "#22c55e" : "#f87171",
              }}
            >
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
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
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
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
              {isSaving ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
