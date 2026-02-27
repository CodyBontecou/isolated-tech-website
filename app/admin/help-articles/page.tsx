import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { DeleteArticleButton } from "./delete-article-button";

export const metadata: Metadata = {
  title: "Help Articles — Admin — ISOLATED.TECH",
};

interface HelpArticle {
  id: string;
  app_id: string | null;
  app_name: string | null;
  app_slug: string | null;
  slug: string;
  title: string;
  category: string;
  article_type: string;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

async function getHelpArticles(): Promise<HelpArticle[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<HelpArticle>(
    `SELECT 
       h.id,
       h.app_id,
       a.name as app_name,
       a.slug as app_slug,
       h.slug,
       h.title,
       h.category,
       h.article_type,
       h.is_published,
       h.sort_order,
       h.created_at,
       h.updated_at
     FROM help_articles h
     LEFT JOIN apps a ON h.app_id = a.id
     ORDER BY h.article_type, h.category, h.sort_order, h.title`,
    [],
    env
  );
}

const TYPE_LABELS: Record<string, string> = {
  help: "Help",
  docs: "Docs",
  faq: "FAQ",
  guide: "Guide",
};

function getArticleUrl(article: HelpArticle): string {
  if (article.article_type === "help" || !article.article_type) {
    return `/help/${article.slug}`;
  }
  if (!article.app_slug) return "#";
  if (article.article_type === "docs") {
    return `/apps/${article.app_slug}/docs/${article.slug}`;
  }
  if (article.article_type === "faq") {
    return `/apps/${article.app_slug}/faq#${article.slug}`;
  }
  if (article.article_type === "guide") {
    return `/apps/${article.app_slug}/guides/${article.slug}`;
  }
  return `/help/${article.slug}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric",
    year: "numeric"
  });
}

export default async function AdminHelpArticlesPage() {
  const articles = await getHelpArticles();

  const publishedCount = articles.filter((a) => a.is_published === 1).length;

  return (
    <>
      <header className="admin-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="admin-header__title">Help Articles</h1>
            <p className="admin-header__subtitle">
              {publishedCount} published • {articles.length - publishedCount} drafts
            </p>
          </div>
          <Link
            href="/admin/help-articles/new"
            style={{
              padding: "0.65rem 1.25rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: "var(--white)",
              color: "var(--black)",
              textDecoration: "none",
            }}
          >
            + NEW ARTICLE
          </Link>
        </div>
      </header>

      {articles.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--gray)",
            fontSize: "0.85rem",
          }}
        >
          No help articles yet. Create your first article to help users.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TITLE</th>
                <th>TYPE</th>
                <th>CATEGORY</th>
                <th>APP</th>
                <th>STATUS</th>
                <th>UPDATED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--gray)" }}>
                        {getArticleUrl(article)}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        background: article.article_type === "help" ? "rgba(255,255,255,0.05)" : "rgba(59, 130, 246, 0.1)",
                        color: article.article_type === "help" ? "#888" : "#3b82f6",
                        border: article.article_type === "help" ? "1px solid #333" : "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      {TYPE_LABELS[article.article_type || "help"]}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid #333",
                      }}
                    >
                      {article.category.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: article.app_name ? "var(--text)" : "var(--gray)" }}>
                      {article.app_name || "General"}
                    </span>
                  </td>
                  <td>
                    {article.is_published === 1 ? (
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          background: "rgba(34, 197, 94, 0.1)",
                          color: "#22c55e",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                        }}
                      >
                        PUBLISHED
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          background: "rgba(107, 114, 128, 0.1)",
                          color: "#6b7280",
                          border: "1px solid rgba(107, 114, 128, 0.3)",
                        }}
                      >
                        DRAFT
                      </span>
                    )}
                  </td>
                  <td className="admin-table__date">
                    {formatDate(article.updated_at)}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      {article.is_published === 1 && (
                        <Link
                          href={getArticleUrl(article)}
                          className="admin-table__btn"
                          target="_blank"
                        >
                          VIEW
                        </Link>
                      )}
                      <Link
                        href={`/admin/help-articles/${article.id}`}
                        className="admin-table__btn"
                      >
                        EDIT
                      </Link>
                      <DeleteArticleButton id={article.id} title={article.title} />
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
