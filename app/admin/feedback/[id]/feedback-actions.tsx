"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FeedbackActionsProps {
  feedbackId: string;
  currentStatus: "open" | "in_progress" | "resolved" | "closed";
  currentNotes: string | null;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "#3b82f6" },
  { value: "in_progress", label: "In Progress", color: "#f59e0b" },
  { value: "resolved", label: "Resolved", color: "#22c55e" },
  { value: "closed", label: "Closed", color: "#6b7280" },
];

export function FeedbackActions({
  feedbackId,
  currentStatus,
  currentNotes,
}: FeedbackActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      setMessage({ type: "success", text: "Changes saved successfully" });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = status !== currentStatus || notes !== (currentNotes || "");

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Status */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--gray)",
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
                background:
                  status === option.value
                    ? `${option.color}20`
                    : "transparent",
                border: `1px solid ${status === option.value ? option.color : "var(--border)"}`,
                color: status === option.value ? option.color : "var(--gray)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {option.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label
          htmlFor="admin-notes"
          style={{
            display: "block",
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--gray)",
            marginBottom: "0.5rem",
          }}
        >
          INTERNAL NOTES
        </label>
        <textarea
          id="admin-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes about this feedback..."
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "0.85rem",
            fontFamily: "inherit",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
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

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !hasChanges}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "0.7rem",
          fontWeight: 600,
          letterSpacing: "0.1em",
          background: hasChanges ? "var(--text)" : "var(--border)",
          border: "none",
          color: hasChanges ? "var(--bg)" : "var(--gray)",
          cursor: hasChanges ? "pointer" : "not-allowed",
          opacity: isSaving ? 0.5 : 1,
        }}
      >
        {isSaving ? "SAVING..." : "SAVE CHANGES"}
      </button>
    </div>
  );
}
