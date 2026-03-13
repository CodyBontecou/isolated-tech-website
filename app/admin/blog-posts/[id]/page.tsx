import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { BlogPostForm } from "../blog-post-form";

export const metadata: Metadata = {
  title: "Edit Blog Post — Admin — ISOLATED.TECH",
};

interface BlogPost {
  id: string;
  app_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  author_name: string | null;
  is_published: number;
  published_at: string | null;
}

async function getBlogPost(id: string): Promise<BlogPost | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<BlogPost>(`SELECT * FROM app_blog_posts WHERE id = ?`, [id], env);
}

async function getApps(): Promise<{ id: string; name: string; slug: string }[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<{ id: string; name: string; slug: string }>(
    `SELECT id, name, slug FROM apps WHERE is_published = 1 ORDER BY name`,
    [],
    env
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const [post, apps] = await Promise.all([getBlogPost(id), getApps()]);

  if (!post) {
    notFound();
  }

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
          Edit Blog Post
        </h1>
      </header>

      <BlogPostForm apps={apps} post={post} />
    </>
  );
}
