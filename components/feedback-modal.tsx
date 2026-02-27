"use client";

import { useState } from "react";

interface FeedbackModalProps {
  appId: string;
  appName: string;
  appVersion: string;
  onClose: () => void;
}

export function FeedbackModal({
  appId,
  appName,
  appVersion,
  onClose,
}: FeedbackModalProps) {
  const [type, setType] = useState<"feedback" | "bug">("feedback");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          appVersion,
          type,
          subject,
          feedbackBody: body,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal__header">
          <h2 className="feedback-modal__title">
            {type === "bug" ? "🐛 Report a Bug" : "💬 Send Feedback"}
          </h2>
          <button
            className="feedback-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="feedback-modal__app">
          <span className="feedback-modal__app-name">{appName}</span>
          <span className="feedback-modal__app-version">v{appVersion}</span>
        </div>

        {success ? (
          <div className="feedback-modal__success">
            <div className="feedback-modal__success-icon">✓</div>
            <p className="feedback-modal__success-text">
              Thank you! Your {type === "bug" ? "bug report" : "feedback"} has
              been submitted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-modal__form">
            <div className="feedback-modal__type-toggle">
              <button
                type="button"
                className={`feedback-modal__type-btn ${type === "feedback" ? "feedback-modal__type-btn--active" : ""}`}
                onClick={() => setType("feedback")}
              >
                💬 Feedback
              </button>
              <button
                type="button"
                className={`feedback-modal__type-btn ${type === "bug" ? "feedback-modal__type-btn--active feedback-modal__type-btn--bug" : ""}`}
                onClick={() => setType("bug")}
              >
                🐛 Bug Report
              </button>
            </div>

            <div className="feedback-modal__field">
              <label htmlFor="feedback-subject" className="feedback-modal__label">
                Subject
              </label>
              <input
                id="feedback-subject"
                type="text"
                className="feedback-modal__input"
                placeholder={
                  type === "bug"
                    ? "Brief description of the bug"
                    : "What's on your mind?"
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            <div className="feedback-modal__field">
              <label htmlFor="feedback-body" className="feedback-modal__label">
                {type === "bug" ? "Steps to reproduce" : "Details"}
              </label>
              <textarea
                id="feedback-body"
                className="feedback-modal__textarea"
                placeholder={
                  type === "bug"
                    ? "1. What were you doing?\n2. What did you expect to happen?\n3. What actually happened?"
                    : "Tell us more..."
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={6}
              />
            </div>

            {error && <div className="feedback-modal__error">{error}</div>}

            <div className="feedback-modal__actions">
              <button
                type="button"
                className="feedback-modal__btn feedback-modal__btn--cancel"
                onClick={onClose}
                disabled={isSubmitting}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="feedback-modal__btn feedback-modal__btn--submit"
                disabled={isSubmitting || !subject.trim() || !body.trim()}
              >
                {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function FeedbackButton({
  appId,
  appName,
  appVersion,
}: {
  appId: string;
  appName: string;
  appVersion: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="purchased-card__btn purchased-card__btn--feedback"
        onClick={() => setIsOpen(true)}
      >
        ✉ FEEDBACK
      </button>
      {isOpen && (
        <FeedbackModal
          appId={appId}
          appName={appName}
          appVersion={appVersion}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
