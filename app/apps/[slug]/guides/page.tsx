import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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

interface GuideArticle {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string;
  sort_order: number;
  updated_at: string;
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

async function getGuideArticles(appId: string): Promise<GuideArticle[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<GuideArticle>(
    `SELECT id, slug, title, body, category, sort_order, updated_at
     FROM help_articles
     WHERE app_id = ? AND article_type = 'guide' AND is_published = 1
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
    title: `Guides — ${app.name} — ISOLATED.TECH`,
    description: `Tutorials and guides for ${app.name}`,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  "getting-started": "Getting Started",
  features: "Features",
  integration: "Integration",
  troubleshooting: "Troubleshooting",
};

function groupByCategory(articles: GuideArticle[]): Map<string, GuideArticle[]> {
  const groups = new Map<string, GuideArticle[]>();
  for (const article of articles) {
    const category = article.category || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(article);
  }
  return groups;
}

export default async function GuidesPage({ params }: Props) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, articles] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getGuideArticles(app.id),
  ]);

  const groupedArticles = groupByCategory(articles);

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/guides`} />

      <main className="guides-page">
        <div className="guides-page__container">
          <header className="guides-page__header">
            <Link href={`/apps/${slug}`} className="guides-page__back">
              ← Back to {app.name}
            </Link>
            <div className="guides-page__title-row">
              {app.icon_url && (
                <img src={app.icon_url} alt="" className="guides-page__app-icon" />
              )}
              <div>
                <h1 className="guides-page__title">Guides & Tutorials</h1>
                <p className="guides-page__subtitle">{app.name}</p>
              </div>
            </div>
          </header>

          {articles.length === 0 ? (
            <div className="guides-empty">
              <p>No guides available yet.</p>
              <p>
                Check out our{" "}
                <Link href={`/apps/${slug}/docs`}>documentation</Link> or{" "}
                <Link href={`/apps/${slug}/faq`}>FAQ</Link> for help.
              </p>
            </div>
          ) : (
            <div className="guides-grid">
              {Array.from(groupedArticles.entries()).map(([category, categoryArticles]) => (
                <section key={category} className="guides-section">
                  {groupedArticles.size > 1 && (
                    <h2 className="guides-section__title">
                      {CATEGORY_LABELS[category] || category}
                    </h2>
                  )}
                  <div className="guides-section__list">
                    {categoryArticles.map((article) => (
                      <Link
                        key={article.id}
                        href={`/apps/${slug}/guides/${article.slug}`}
                        className="guide-card"
                      >
                        <h3 className="guide-card__title">{article.title}</h3>
                        <p className="guide-card__excerpt">
                          {article.body.slice(0, 120).replace(/[#*_`]/g, "")}...
                        </p>
                        <span className="guide-card__meta">
                          {new Date(article.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <AppFooter />

      <style>{`
        .guides-page {
          min-height: 100vh;
          padding: 2rem 1.5rem;
        }
        .guides-page__container {
          max-width: 900px;
          margin: 0 auto;
        }
        .guides-page__header {
          margin-bottom: 3rem;
        }
        .guides-page__back {
          font-size: 0.75rem;
          color: var(--gray);
          text-decoration: none;
          letter-spacing: 0.05em;
        }
        .guides-page__back:hover {
          color: var(--text);
        }
        .guides-page__title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }
        .guides-page__app-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
        }
        .guides-page__title {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .guides-page__subtitle {
          font-size: 0.85rem;
          color: var(--gray);
          margin: 0.25rem 0 0;
        }

        .guides-empty {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
          font-size: 0.9rem;
        }
        .guides-empty a {
          color: var(--text);
        }

        .guides-section {
          margin-bottom: 2.5rem;
        }
        .guides-section__title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #666;
          text-transform: uppercase;
          margin: 0 0 1rem;
        }
        .guides-section__list {
          display: grid;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .guides-section__list {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .guide-card {
          display: block;
          padding: 1.25rem;
          border: 1px solid #222;
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .guide-card:hover {
          border-color: #444;
          background: rgba(255, 255, 255, 0.02);
        }
        .guide-card__title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 0.5rem;
        }
        .guide-card__excerpt {
          font-size: 0.85rem;
          color: #888;
          line-height: 1.5;
          margin: 0 0 0.75rem;
        }
        .guide-card__meta {
          font-size: 0.7rem;
          color: #555;
          letter-spacing: 0.05em;
        }
      `}</style>
    </>
  );
}
