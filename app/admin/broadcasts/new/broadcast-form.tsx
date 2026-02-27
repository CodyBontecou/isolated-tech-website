"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BroadcastFormProps {
  subscriberCount: number;
}

export function BroadcastForm({ subscriberCount }: BroadcastFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSendTest = async () => {
    setSendingTest(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/broadcast/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test email");
      }

      setSuccess("Test email sent to cody@isolated.tech!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, status: "draft" }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to save draft");
      }

      router.push(`/admin/broadcasts/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!confirm(`Send this email to ${subscriberCount} subscribers? This cannot be undone.`)) {
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, status: "sending", sendNow: true }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to send broadcast");
      }

      router.push(`/admin/broadcasts/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const renderPreview = (): string => {
    // Simple markdown-ish to HTML conversion
    const html = body
      .split("\n\n")
      .map((p: string) => `<p style="margin: 0 0 1em 0; color: #f0f0f0; font-size: 14px;">${p}</p>`)
      .join("");

    return `
      <div style="background: #1a1a1a; border: 1px solid #333; padding: 30px; font-family: 'Courier New', monospace;">
        <h1 style="margin: 0 0 30px 0; font-size: 14px; color: #666; letter-spacing: 2px;">
          ISOLATED<span style="color: #fff;">.</span>TECH
        </h1>
        ${html}
        <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
          You're receiving this because you're subscribed to ISOLATED.TECH updates.<br>
          <a href="#" style="color: #666;">Unsubscribe</a>
        </p>
      </div>
    `;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
      {/* Editor */}
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.7rem",
              letterSpacing: "1px",
              color: "#666",
              marginBottom: "0.5rem",
            }}
          >
            SUBJECT
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="settings-input"
            placeholder="Your email subject"
            style={{ width: "100%", fontSize: "1rem" }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.7rem",
              letterSpacing: "1px",
              color: "#666",
              marginBottom: "0.5rem",
            }}
          >
            BODY
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="settings-input"
            placeholder="Write your email content here...

Use double line breaks for paragraphs."
            rows={16}
            style={{
              width: "100%",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1.5rem",
              background: "#7f1d1d",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1.5rem",
              background: "#14532d",
              border: "1px solid #22c55e",
              color: "#86efac",
              fontSize: "0.85rem",
            }}
          >
            {success}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleSendNow}
            className="auth-btn"
            disabled={sending || loading || sendingTest || !subject || !body || subscriberCount === 0}
            style={{
              width: "auto",
              padding: "0.75rem 1.5rem",
              background: "#22c55e",
              opacity: sending || loading || sendingTest || !subject || !body || subscriberCount === 0 ? 0.5 : 1,
            }}
          >
            {sending ? "SENDING..." : `SEND TO ${subscriberCount} SUBSCRIBERS`}
          </button>
          <button
            onClick={handleSendTest}
            className="auth-btn auth-btn--outline"
            disabled={sendingTest || sending || loading || !subject || !body}
            style={{
              width: "auto",
              padding: "0.75rem 1.5rem",
              opacity: sendingTest || sending || loading || !subject || !body ? 0.5 : 1,
            }}
          >
            {sendingTest ? "SENDING..." : "SEND TEST"}
          </button>
          <button
            onClick={handleSaveDraft}
            className="auth-btn auth-btn--outline"
            disabled={loading || sending || sendingTest || !subject}
            style={{
              width: "auto",
              padding: "0.75rem 1.5rem",
              opacity: loading || sending || sendingTest || !subject ? 0.5 : 1,
            }}
          >
            {loading ? "SAVING..." : "SAVE DRAFT"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="auth-btn auth-btn--outline"
            style={{ width: "auto", padding: "0.75rem 1.5rem" }}
          >
            CANCEL
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              letterSpacing: "1px",
              color: "#666",
            }}
          >
            PREVIEW
          </span>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#999",
              padding: "0.25rem 0.5rem",
              fontSize: "0.65rem",
              cursor: "pointer",
            }}
          >
            {previewMode ? "HTML" : "RENDERED"}
          </button>
        </div>

        <div
          style={{
            background: "#0a0a0a",
            border: "1px solid #333",
            padding: "1rem",
            minHeight: "400px",
          }}
        >
          {subject && (
            <div
              style={{
                borderBottom: "1px solid #333",
                paddingBottom: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "0.65rem", color: "#666", marginBottom: "0.25rem" }}>
                Subject:
              </div>
              <div style={{ fontWeight: 600 }}>{subject}</div>
            </div>
          )}

          {body ? (
            previewMode ? (
              <pre
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#999",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {renderPreview()}
              </pre>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderPreview() }} />
            )
          ) : (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              Start typing to see preview...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
