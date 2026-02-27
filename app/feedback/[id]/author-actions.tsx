"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
  title: string;
  body: string;
  type: "feature" | "bug" | "improvement";
  createdAt: string;
  isAdmin: boolean;
}

const EDIT_WINDOW_HOURS = 24;

function canEdit(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours <= EDIT_WINDOW_HOURS;
}

function getTimeRemaining(createdAt: string): string {
  const created = new Date(createdAt);
  const editDeadline = new Date(created.getTime() + EDIT_WINDOW_HOURS * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = editDeadline.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Expired";
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) return `${hours}h ${minutes}m left to edit`;
  return `${minutes}m left to edit`;
}

export function AuthorActions({ requestId, title, body, type, createdAt, isAdmin }: Props) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editBody, setEditBody] = useState(body);
  const [editType, setEditType] = useState(type);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editAllowed = isAdmin || canEdit(createdAt);
  const timeRemaining = !isAdmin ? getTimeRemaining(createdAt) : null;

  const handleEdit = async () => {
    if (!editTitle.trim() || !editBody.trim()) {
      setError("Title and description are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/feedback/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          type: editType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update");
      }

      setIsEditOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/feedback/${requestId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }

      router.push("/feedback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="feedback-author-actions">
        {editAllowed && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="feedback-author-actions__btn"
          >
            ✏️ Edit
          </button>
        )}
        <button
          onClick={() => setIsDeleteOpen(true)}
          className="feedback-author-actions__btn feedback-author-actions__btn--danger"
        >
          🗑️ Delete
        </button>
        {timeRemaining && editAllowed && (
          <span className="feedback-author-actions__timer">{timeRemaining}</span>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div
          className="feedback-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setIsEditOpen(false)}
        >
          <div className="feedback-modal">
            <div className="feedback-modal__header">
              <h3 className="feedback-modal__title">Edit Request</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="feedback-modal__close"
              >
                ×
              </button>
            </div>

            <div className="feedback-modal__body">
              {/* Type Selector */}
              <div className="feedback-modal__field">
                <label className="feedback-modal__label">TYPE</label>
                <div className="feedback-modal__type-btns">
                  {(["feature", "bug", "improvement"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`feedback-modal__type-btn ${
                        editType === t ? "feedback-modal__type-btn--active" : ""
                      }`}
                      data-type={t}
                    >
                      {t === "bug" ? "🐛 Bug" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="feedback-modal__field">
                <label className="feedback-modal__label">TITLE</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="feedback-modal__input"
                />
                <span className="feedback-modal__counter">
                  {editTitle.length}/200
                </span>
              </div>

              {/* Body */}
              <div className="feedback-modal__field">
                <label className="feedback-modal__label">DESCRIPTION</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={6}
                  className="feedback-modal__textarea"
                />
              </div>

              {/* Error */}
              {error && <div className="feedback-modal__error">{error}</div>}
            </div>

            <div className="feedback-modal__footer">
              <button
                onClick={() => setIsEditOpen(false)}
                className="feedback-modal__btn feedback-modal__btn--secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isSubmitting}
                className="feedback-modal__btn feedback-modal__btn--primary"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div
          className="feedback-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setIsDeleteOpen(false)}
        >
          <div className="feedback-modal feedback-modal--small">
            <div className="feedback-modal__header">
              <h3 className="feedback-modal__title">Delete Request</h3>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="feedback-modal__close"
              >
                ×
              </button>
            </div>

            <div className="feedback-modal__body">
              <p className="feedback-modal__text">
                Are you sure you want to delete this feedback request? This action cannot be undone.
              </p>
              <p className="feedback-modal__text feedback-modal__text--muted">
                All votes and comments will also be deleted.
              </p>

              {error && <div className="feedback-modal__error">{error}</div>}
            </div>

            <div className="feedback-modal__footer">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="feedback-modal__btn feedback-modal__btn--secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="feedback-modal__btn feedback-modal__btn--danger"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
