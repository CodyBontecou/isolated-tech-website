import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { BlogPostForm } from "../blog-post-form";

export const metadata: Metadata = {
  title: "New Blog Post — Admin — ISOLATED.TECH",
};

async function getApps(): Promise<{ id: string; name: string; slug: string }[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<{ id: string; name: string; slug: string }>(
    `SELECT id, name, slug FROM apps WHERE is_published = 1 ORDER BY name`,
    [],
    env
  );
}

export default async function NewBlogPostPage() {
  const apps = await getApps();

  return (
    <>
      <header className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/admin/blog-posts"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.85rem",
            }}
          >
            ← Blog Posts
          </Link>
        </div>
        <h1 className="admin-header__title" style={{ marginTop: "0.5rem" }}>
          New Blog Post
        </h1>
      </header>

      <BlogPostForm apps={apps} />
    </>
  );
}
