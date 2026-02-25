"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewFormProps {
  appId: string;
  appName: string;
  appSlug: string;
  existingReview?: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
  };
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div
      style={{ display: "flex", gap: "4px" }}
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          style={{
            background: "none",
            border: "none",
            cursor: "crosshair",
            fontSize: "2rem",
            color:
              star <= (hoverRating || value) ? "#fbbf24" : "#333",
            transition: "color 0.1s",
            padding: "0.25rem",
          }}
          aria-label={`Rate ${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  appId,
  appName,
  appSlug,
  existingReview,
}: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || "");
  const [body, setBody] = useState(existingReview?.body || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!existingReview;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/reviews/${existingReview.id}`
        : "/api/reviews";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          rating,
          title: title.trim() || null,
          body: body.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      router.push("/dashboard/reviews?success=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="auth-message auth-message--error" style={{ marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Rating */}
      <div style={{ marginBottom: "2rem" }}>
        <label className="settings-label">RATING *</label>
        <StarRatingInput value={rating} onChange={setRating} />
        <p style={{ fontSize: "0.75rem", color: "var(--gray)", marginTop: "0.5rem" }}>
          {rating === 0
            ? "Click to rate"
            : rating === 1
              ? "Poor"
              : rating === 2
                ? "Fair"
                : rating === 3
                  ? "Good"
                  : rating === 4
                    ? "Very Good"
                    : "Excellent"}
        </p>
      </div>

      {/* Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">HEADLINE (OPTIONAL)</label>
        <input
          type="text"
          className="settings-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your review"
          maxLength={100}
        />
      </div>

      {/* Body */}
      <div style={{ marginBottom: "2rem" }}>
        <label className="settings-label">YOUR REVIEW (OPTIONAL)</label>
        <textarea
          className="settings-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you like or dislike about this app?"
          rows={6}
          maxLength={2000}
          style={{ resize: "vertical", minHeight: "120px" }}
        />
        <p style={{ fontSize: "0.7rem", color: "var(--gray)", marginTop: "0.5rem" }}>
          {body.length} / 2000 characters
        </p>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          className="auth-btn"
          disabled={isSubmitting || rating === 0}
          style={{ width: "auto" }}
        >
          {isSubmitting
            ? "SUBMITTING..."
            : isEditing
              ? "UPDATE REVIEW"
              : "SUBMIT REVIEW"}
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
