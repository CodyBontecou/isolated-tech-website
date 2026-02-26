"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteReviewButtonProps {
  reviewId: string;
  appName: string;
}

export function DeleteReviewButton({ reviewId, appName }: DeleteReviewButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete review");
      }

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--gray)" }}>
          Delete review for {appName}?
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="admin-table__btn admin-table__btn--danger"
        >
          {isDeleting ? "..." : "YES"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="admin-table__btn"
        >
          NO
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="admin-table__btn admin-table__btn--danger"
    >
      DELETE
    </button>
  );
}
