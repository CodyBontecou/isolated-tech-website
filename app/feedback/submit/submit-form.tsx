"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface App {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
}

type FeedbackType = "feature" | "bug" | "improvement";

export function SubmitForm({ apps }: { apps: App[] }) {
  const router = useRouter();
  const [type, setType] = useState<FeedbackType>("feature");
  const [appId, setAppId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          appId: appId || null,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle rate limit with friendly message
        if (res.status === 429 || data.rateLimited) {
          throw new Error(data.error || "You've submitted too many requests today. Please try again tomorrow.");
        }
        throw new Error(data.error || "Failed to submit feedback");
      }

      // Redirect to the new feedback item
      router.push(`/feedback/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const typeConfig = {
    feature: {
      label: "Feature Request",
      description: "Suggest a new feature or capability",
      placeholder: "e.g., Add dark mode support, Export to CSV...",
    },
    bug: {
      label: "🐛 Bug Report",
      description: "Report something that's broken or not working correctly",
      placeholder: "e.g., App crashes when..., Button doesn't respond...",
    },
    improvement: {
      label: "Improvement",
      description: "Suggest an enhancement to an existing feature",
      placeholder: "e.g., Make the search faster, Improve the UI...",
    },
  };

  return (
    <form onSubmit={handleSubmit} className="submit-form">
      {/* Type Selection */}
      <div className="submit-field">
        <label className="submit-label">TYPE</label>
        <div className="submit-type-options">
          {(["feature", "bug", "improvement"] as FeedbackType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`submit-type-btn ${type === t ? "submit-type-btn--active" : ""} ${t === "bug" && type === t ? "submit-type-btn--bug" : ""}`}
            >
              <span className="submit-type-btn__label">{typeConfig[t].label}</span>
              <span className="submit-type-btn__desc">{typeConfig[t].description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* App Selection */}
      {apps.length > 0 && (
        <div className="submit-field">
          <label className="submit-label">APP (OPTIONAL)</label>
          <select
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className="submit-select"
          >
            <option value="">General feedback (no specific app)</option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div className="submit-field">
        <label className="submit-label">TITLE</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={typeConfig[type].placeholder}
          required
          maxLength={200}
          className="submit-input"
        />
        <span className="submit-hint">{title.length}/200 characters</span>
      </div>

      {/* Body */}
      <div className="submit-field">
        <label className="submit-label">DESCRIPTION</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            type === "bug"
              ? "Describe what happened, what you expected, and steps to reproduce..."
              : "Explain your idea in detail. Why would this be useful? How would it work?"
          }
          required
          rows={6}
          className="submit-textarea"
        />
      </div>

      {/* Error */}
      {error && <div className="submit-error">{error}</div>}

      {/* Actions */}
      <div className="submit-actions">
        <button
          type="button"
          onClick={() => router.push("/feedback")}
          className="submit-btn submit-btn--cancel"
          disabled={isSubmitting}
        >
          CANCEL
        </button>
        <button
          type="submit"
          className="submit-btn submit-btn--submit"
          disabled={isSubmitting || !title.trim() || !body.trim()}
        >
          {isSubmitting ? "SUBMITTING..." : "SUBMIT FEEDBACK"}
        </button>
      </div>
    </form>
  );
}
