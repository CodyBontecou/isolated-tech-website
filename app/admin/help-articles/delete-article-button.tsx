"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteArticleButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/help-articles/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete article");
      }
    } catch {
      alert("Failed to delete article");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="admin-table__btn admin-table__btn--danger"
    >
      {isDeleting ? "..." : "DELETE"}
    </button>
  );
}
