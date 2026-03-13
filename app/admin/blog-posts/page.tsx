import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { DeleteBlogPostButton } from "./delete-blog-post-button";

export const metadata: Metadata = {
  title: "Blog Posts — Admin — ISOLATED.TECH",
};

interface BlogPost {
  id: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  slug: string;
  title: string;
  excerpt: string | null;
  is_published: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<BlogPost>(
    `SELECT 
       p.id,
       p.app_id,
       a.name as app_name,
       a.slug as app_slug,
       p.slug,
       p.title,
       p.excerpt,
       p.is_published,
       p.published_at,
       p.created_at,
       p.updated_at
     FROM app_blog_posts p
     JOIN apps a ON p.app_id = a.id
     ORDER BY p.updated_at DESC`,
    [],
    env
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminBlogPostsPage() {
  const posts = await getBlogPosts();

  const publishedCount = posts.filter((p) => p.is_published === 1).length;

  return (
    <>
      <header className="admin-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="admin-header__title">Blog Posts</h1>
            <p className="admin-header__subtitle">
              {publishedCount} published • {posts.length - publishedCount} drafts
            </p>
          </div>
          <Link
            href="/admin/blog-posts/new"
            style={{
              padding: "0.75rem 1.35rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: "var(--white)",
              color: "var(--black)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
            }}
          >
            + NEW POST
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.7,
          }}
        >
          No blog posts yet. Create your first blog post for an app.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>APP</th>
                <th>STATUS</th>
                <th>PUBLISHED</th>
                <th>UPDATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
                        {post.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                        }}
                      >
                        /apps/{post.app_slug}/blog/{post.slug}
                      </div>
                    </div>
                  </td>
                  <td>
                    <Link
                      href={`/apps/${post.app_slug}`}
                      style={{ color: "var(--text)", textDecoration: "none" }}
                    >
                      {post.app_name}
                    </Link>
                  </td>
                  <td>
                    {post.is_published === 1 ? (
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: "rgba(34, 197, 94, 0.12)",
                          color: "#22c55e",
                          border: "1px solid rgba(34, 197, 94, 0.35)",
                        }}
                      >
                        PUBLISHED
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          background: "rgba(107, 114, 128, 0.14)",
                          color: "#9ca3af",
                          border: "1px solid rgba(156, 163, 175, 0.35)",
                        }}
                      >
                        DRAFT
                      </span>
                    )}
                  </td>
                  <td className="admin-table__date">{formatDate(post.published_at)}</td>
                  <td className="admin-table__date">{formatDate(post.updated_at)}</td>
                  <td>
                    <div className="admin-table__actions">
                      {post.is_published === 1 && (
                        <Link
                          href={`/apps/${post.app_slug}/blog/${post.slug}`}
                          className="admin-table__btn"
                          target="_blank"
                        >
                          VIEW
                        </Link>
                      )}
                      <Link href={`/admin/blog-posts/${post.id}`} className="admin-table__btn">
                        EDIT
                      </Link>
                      <DeleteBlogPostButton id={post.id} title={post.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
