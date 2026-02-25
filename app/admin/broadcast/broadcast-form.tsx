"use client";

import { useState } from "react";

interface BroadcastFormProps {
  apps: { id: string; name: string; purchaser_count: number }[];
  stats: { total_users: number; newsletter_subscribers: number };
}

type Audience = "newsletter" | "app" | "all";

export function BroadcastForm({ apps, stats }: BroadcastFormProps) {
  const [audience, setAudience] = useState<Audience>("newsletter");
  const [appId, setAppId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedApp = apps.find((a) => a.id === appId);

  const recipientCount =
    audience === "newsletter"
      ? stats.newsletter_subscribers
      : audience === "all"
        ? stats.total_users
        : selectedApp?.purchaser_count || 0;

  const handleSendTest = async () => {
    setError(null);
    setSuccess(null);

    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }

    if (!body.trim()) {
      setError("Body is required");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/admin/broadcast/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send test email");
      }

      setSuccess("Test email sent to your admin email!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    setError(null);
    setSuccess(null);

    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }

    if (!body.trim()) {
      setError("Body is required");
      return;
    }

    if (audience === "app" && !appId) {
      setError("Please select an app");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${recipientCount} recipients?`
    );

    if (!confirmed) return;

    setIsSending(true);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          appId: audience === "app" ? appId : null,
          subject,
          body,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send broadcast");
      }

      const data = await res.json();
      setSuccess(`Broadcast sent to ${data.sent_count} recipients!`);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  // Simple markdown to HTML for preview
  const renderBody = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");
  };

  return (
    <div>
      {error && (
        <div
          className="auth-message auth-message--error"
          style={{ marginBottom: "1.5rem" }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="auth-message auth-message--success"
          style={{ marginBottom: "1.5rem" }}
        >
          {success}
        </div>
      )}

      {/* Audience Selection */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">AUDIENCE</label>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "crosshair",
            }}
          >
            <input
              type="radio"
              name="audience"
              value="newsletter"
              checked={audience === "newsletter"}
              onChange={() => setAudience("newsletter")}
            />
            <span>Newsletter Subscribers ({stats.newsletter_subscribers})</span>
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
              type="radio"
              name="audience"
              value="app"
              checked={audience === "app"}
              onChange={() => setAudience("app")}
            />
            <span>App Purchasers</span>
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
              type="radio"
              name="audience"
              value="all"
              checked={audience === "all"}
              onChange={() => setAudience("all")}
            />
            <span>All Users ({stats.total_users})</span>
          </label>
        </div>
      </div>

      {/* App Selector (if app audience) */}
      {audience === "app" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label className="settings-label">SELECT APP</label>
          <select
            className="settings-input"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          >
            <option value="">Choose an app...</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.purchaser_count} purchasers)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subject */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">SUBJECT</label>
        <input
          type="text"
          className="settings-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Your email subject line"
          maxLength={200}
        />
      </div>

      {/* Body */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">BODY (MARKDOWN SUPPORTED)</label>
        <textarea
          className="settings-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email content here. Use **bold** and *italic* for formatting."
          rows={12}
          style={{ resize: "vertical", minHeight: "200px" }}
        />
      </div>

      {/* Preview Toggle */}
      {(subject || body) && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button
            type="button"
            className="auth-btn auth-btn--outline"
            onClick={() => setShowPreview(!showPreview)}
            style={{ width: "auto" }}
          >
            {showPreview ? "HIDE PREVIEW" : "SHOW PREVIEW"}
          </button>

          {showPreview && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1.5rem",
                background: "#fff",
                color: "#000",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  paddingBottom: "1rem",
                  marginBottom: "1rem",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <strong>Subject:</strong> {subject || "(No subject)"}
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: `<p>${renderBody(body) || "(No content)"}</p>`,
                }}
                style={{ lineHeight: 1.6 }}
              />
            </div>
          )}
        </div>
      )}

      {/* Recipient Count */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "var(--black)",
          border: "var(--border)",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--gray)" }}>
          This email will be sent to{" "}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          {recipientCount}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--gray)" }}>
          {" "}recipients
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="auth-btn"
          onClick={handleSend}
          disabled={isSending || recipientCount === 0}
          style={{ width: "auto" }}
        >
          {isSending ? "SENDING..." : `SEND TO ${recipientCount} RECIPIENTS`}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={handleSendTest}
          disabled={isSending}
          style={{ width: "auto" }}
        >
          SEND TEST EMAIL
        </button>
      </div>
    </div>
  );
}
