import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { AppNav, AppFooter } from "@/components/app-page";

interface Props {
  params: Promise<{ slug: string }>;
}

interface App {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
}

interface DocArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  sort_order: number;
}

async function getApp(slug: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<App>(
    `SELECT id, slug, name, icon_url FROM apps WHERE slug = ? AND is_published = 1`,
    [slug],
    env
  );
}

async function getDocArticles(appId: string): Promise<DocArticle[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<DocArticle>(
    `SELECT id, slug, title, category, sort_order
     FROM help_articles
     WHERE app_id = ? AND article_type = 'docs' AND is_published = 1
     ORDER BY category, sort_order, title`,
    [appId],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    return { title: "Not Found — ISOLATED.TECH" };
  }

  return {
    title: `Documentation — ${app.name} — ISOLATED.TECH`,
    description: `Documentation and guides for ${app.name}`,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  "getting-started": "Getting Started",
  features: "Features",
  integration: "Integration",
  troubleshooting: "Troubleshooting",
};

function groupByCategory(articles: DocArticle[]): Map<string, DocArticle[]> {
  const groups = new Map<string, DocArticle[]>();
  for (const article of articles) {
    const category = article.category || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(article);
  }
  return groups;
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, articles] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getDocArticles(app.id),
  ]);

  // If there are articles, redirect to the first one
  if (articles.length > 0) {
    redirect(`/apps/${slug}/docs/${articles[0].slug}`);
  }

  const groupedArticles = groupByCategory(articles);

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/docs`} />

      <main className="docs-page">
        <div className="docs-page__container">
          <header className="docs-page__header">
            <Link href={`/apps/${slug}`} className="docs-page__back">
              ← Back to {app.name}
            </Link>
            <div className="docs-page__title-row">
              {app.icon_url && (
                <img src={app.icon_url} alt="" className="docs-page__app-icon" />
              )}
              <div>
                <h1 className="docs-page__title">Documentation</h1>
                <p className="docs-page__subtitle">{app.name}</p>
              </div>
            </div>
          </header>

          <div className="docs-empty">
            <p>No documentation available yet.</p>
            <p>
              Have questions? Check out our{" "}
              <Link href={`/apps/${slug}/faq`}>FAQ</Link> or{" "}
              <Link href="/feedback">submit a request</Link>.
            </p>
          </div>
        </div>
      </main>

      <AppFooter />

      <style>{`
        .docs-page {
          min-height: 100vh;
          padding: 2rem 1.5rem;
        }
        .docs-page__container {
          max-width: 900px;
          margin: 0 auto;
        }
        .docs-page__header {
          margin-bottom: 2rem;
        }
        .docs-page__back {
          font-size: 0.75rem;
          color: var(--gray);
          text-decoration: none;
          letter-spacing: 0.05em;
        }
        .docs-page__back:hover {
          color: var(--text);
        }
        .docs-page__title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }
        .docs-page__app-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
        }
        .docs-page__title {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .docs-page__subtitle {
          font-size: 0.85rem;
          color: var(--gray);
          margin: 0.25rem 0 0;
        }
        .docs-empty {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
          font-size: 0.9rem;
        }
        .docs-empty a {
          color: var(--text);
        }
      `}</style>
    </>
  );
}
