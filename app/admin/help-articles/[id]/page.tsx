import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { ArticleForm } from "../article-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Help Article — Admin — ISOLATED.TECH",
};

interface HelpArticle {
  id: string;
  app_id: string | null;
  slug: string;
  title: string;
  body: string;
  category: string;
  sort_order: number;
  is_published: number;
}

async function getArticle(id: string): Promise<HelpArticle | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<HelpArticle>(
    `SELECT id, app_id, slug, title, body, category, sort_order, is_published 
     FROM help_articles WHERE id = ?`,
    [id],
    env
  );
}

async function getApps(): Promise<{ id: string; name: string }[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query(`SELECT id, name FROM apps WHERE is_published = 1 ORDER BY name`, [], env);
}

export default async function EditHelpArticlePage({ params }: Props) {
  const { id } = await params;
  const [article, apps] = await Promise.all([
    getArticle(id),
    getApps(),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <>
      <header className="admin-header">
        <Link
          href="/admin/help-articles"
          style={{ fontSize: "0.75rem", color: "var(--gray)", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to Help Articles
        </Link>
        <h1 className="admin-header__title">Edit Article</h1>
        <p className="admin-header__subtitle">{article.title}</p>
      </header>

      <ArticleForm apps={apps} article={article} />
    </>
  );
}
