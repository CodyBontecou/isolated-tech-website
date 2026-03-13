"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  title: string;
}

export function DeleteBlogPostButton({ id, title }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/blog-posts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete blog post");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="admin-table__btn admin-table__btn--danger"
      style={{ opacity: isDeleting ? 0.5 : 1 }}
    >
      {isDeleting ? "..." : "DELETE"}
    </button>
  );
}
