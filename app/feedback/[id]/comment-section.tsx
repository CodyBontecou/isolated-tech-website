"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Comment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_image: string | null;
  body: string;
  is_admin_reply: number;
  created_at: string;
}

interface Props {
  requestId: string;
  comments: Comment[];
  isLoggedIn: boolean;
  isAdmin: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CommentCard({ comment }: { comment: Comment }) {
  const isAdmin = comment.is_admin_reply === 1;

  return (
    <div className={`feedback-comment ${isAdmin ? "feedback-comment--admin" : ""}`}>
      <div className="feedback-comment__header">
        <div className="feedback-comment__author">
          {comment.user_image ? (
            <img src={comment.user_image} alt="" className="feedback-comment__avatar" />
          ) : (
            <div className="feedback-comment__avatar feedback-comment__avatar--placeholder">
              {(comment.user_name || "A")[0].toUpperCase()}
            </div>
          )}
          <span className="feedback-comment__name">{comment.user_name || "Anonymous"}</span>
          {isAdmin && <span className="feedback-comment__admin-badge">TEAM</span>}
        </div>
        <span className="feedback-comment__time">{formatTimeAgo(comment.created_at)}</span>
      </div>
      <div className="feedback-comment__body">
        {comment.body.split("\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

export function CommentSection({ requestId, comments: initialComments, isLoggedIn, isAdmin }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          body: newComment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle rate limit with friendly message
        if (res.status === 429 || data.rateLimited) {
          throw new Error(data.error || "You've posted too many comments today. Please try again tomorrow.");
        }
        throw new Error(data.error || "Failed to post comment");
      }

      // Add the new comment to the list
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="feedback-comments">
      <h2 className="feedback-comments__title">
        Discussion
        <span className="feedback-comments__count">{comments.length}</span>
      </h2>

      {/* Comment List */}
      {comments.length > 0 ? (
        <div className="feedback-comments__list">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <p className="feedback-comments__empty">
          No comments yet. Be the first to share your thoughts!
        </p>
      )}

      {/* New Comment Form */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="feedback-comments__form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="feedback-comments__textarea"
          />
          {error && <div className="feedback-comments__error">{error}</div>}
          <div className="feedback-comments__actions">
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="feedback-comments__btn"
            >
              {isSubmitting ? "POSTING..." : "POST COMMENT"}
            </button>
          </div>
        </form>
      ) : (
        <div className="feedback-comments__login">
          <a href={`/auth/login?redirect=/feedback/${requestId}`} className="feedback-comments__login-btn">
            Sign in to comment
          </a>
        </div>
      )}
    </section>
  );
}
