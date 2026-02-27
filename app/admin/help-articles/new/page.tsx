import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { ArticleForm } from "../article-form";

export const metadata: Metadata = {
  title: "New Help Article — Admin — ISOLATED.TECH",
};

async function getApps(): Promise<{ id: string; name: string }[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query(`SELECT id, name FROM apps WHERE is_published = 1 ORDER BY name`, [], env);
}

export default async function NewHelpArticlePage() {
  const apps = await getApps();

  return (
    <>
      <header className="admin-header">
        <Link
          href="/admin/help-articles"
          style={{ fontSize: "0.75rem", color: "var(--gray)", marginBottom: "1rem", display: "inline-block" }}
        >
          ← Back to Help Articles
        </Link>
        <h1 className="admin-header__title">New Help Article</h1>
      </header>

      <ArticleForm apps={apps} />
    </>
  );
}
