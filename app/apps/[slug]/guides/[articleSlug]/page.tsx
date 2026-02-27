import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { AppNav, AppFooter } from "@/components/app-page";

interface Props {
  params: Promise<{ slug: string; articleSlug: string }>;
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
  updated_at: string;
}

interface GuideNavItem {
  id: string;
  slug: string;
  title: string;
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

async function getGuideArticle(appId: string, articleSlug: string): Promise<GuideArticle | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<GuideArticle>(
    `SELECT id, slug, title, body, category, updated_at
     FROM help_articles
     WHERE app_id = ? AND slug = ? AND article_type = 'guide' AND is_published = 1`,
    [appId, articleSlug],
    env
  );
}

async function getOtherGuides(appId: string, currentSlug: string): Promise<GuideNavItem[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<GuideNavItem>(
    `SELECT id, slug, title
     FROM help_articles
     WHERE app_id = ? AND article_type = 'guide' AND is_published = 1 AND slug != ?
     ORDER BY sort_order, title
     LIMIT 5`,
    [appId, currentSlug],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "Not Found — ISOLATED.TECH" };

  const article = await getGuideArticle(app.id, articleSlug);
  if (!article) return { title: "Not Found — ISOLATED.TECH" };

  return {
    title: `${article.title} — ${app.name} Guides — ISOLATED.TECH`,
    description: article.body.slice(0, 160).replace(/[#*_]/g, ""),
  };
}

function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<'))
    .map(p => `<p>${p}</p>`)
    .join('');
}

export default async function GuideArticlePage({ params }: Props) {
  const { slug, articleSlug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, article, otherGuides] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getGuideArticle(app.id, articleSlug),
    getOtherGuides(app.id, articleSlug),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/guides/${articleSlug}`} />

      <main className="guide-article">
        <div className="guide-article__container">
          <Link href={`/apps/${slug}/guides`} className="guide-article__back">
            ← All Guides
          </Link>

          <article className="guide-article__content">
            <header className="guide-article__header">
              <Link href={`/apps/${slug}`} className="guide-article__app">
                {app.icon_url && (
                  <img src={app.icon_url} alt="" className="guide-article__app-icon" />
                )}
                {app.name}
              </Link>
              <h1 className="guide-article__title">{article.title}</h1>
              <p className="guide-article__updated">
                Last updated:{" "}
                {new Date(article.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </header>

            <div
              className="guide-article__body"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(article.body) }}
            />
          </article>

          {otherGuides.length > 0 && (
            <aside className="guide-article__related">
              <h2 className="guide-article__related-title">More Guides</h2>
              <ul className="guide-article__related-list">
                {otherGuides.map((guide) => (
                  <li key={guide.id}>
                    <Link href={`/apps/${slug}/guides/${guide.slug}`}>
                      {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={`/apps/${slug}/guides`} className="guide-article__related-all">
                View all guides →
              </Link>
            </aside>
          )}

          <div className="guide-article__footer">
            <p>Was this guide helpful?</p>
            <div className="guide-article__footer-actions">
              <Link href="/feedback" className="guide-article__footer-btn">
                Give Feedback
              </Link>
              <Link href={`/apps/${slug}/faq`} className="guide-article__footer-link">
                Browse FAQ
              </Link>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />

      <style>{`
        .guide-article {
          min-height: 100vh;
          padding: 2rem 1.5rem;
        }
        .guide-article__container {
          max-width: 800px;
          margin: 0 auto;
        }
        .guide-article__back {
          font-size: 0.75rem;
          color: var(--gray);
          text-decoration: none;
          letter-spacing: 0.05em;
        }
        .guide-article__back:hover {
          color: var(--text);
        }

        .guide-article__content {
          margin: 2rem 0;
        }
        .guide-article__header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #222;
        }
        .guide-article__app {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #888;
          text-decoration: none;
          margin-bottom: 0.75rem;
        }
        .guide-article__app:hover {
          color: var(--text);
        }
        .guide-article__app-icon {
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }
        .guide-article__title {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .guide-article__updated {
          font-size: 0.8rem;
          color: #666;
          margin: 0.5rem 0 0;
        }

        .guide-article__body {
          font-size: 0.95rem;
          line-height: 1.8;
          color: #ccc;
        }
        .guide-article__body h1,
        .guide-article__body h2,
        .guide-article__body h3 {
          color: var(--text);
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .guide-article__body h2 {
          font-size: 1.4rem;
        }
        .guide-article__body h3 {
          font-size: 1.1rem;
        }
        .guide-article__body p {
          margin: 0 0 1rem;
        }
        .guide-article__body code {
          background: #1a1a1a;
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          font-size: 0.85em;
        }
        .guide-article__body pre {
          background: #1a1a1a;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .guide-article__body pre code {
          background: none;
          padding: 0;
        }
        .guide-article__body ul,
        .guide-article__body ol {
          padding-left: 1.5rem;
          margin: 0 0 1rem;
        }
        .guide-article__body a {
          color: #60a5fa;
        }
        .guide-article__body a:hover {
          text-decoration: underline;
        }

        .guide-article__related {
          padding: 1.5rem;
          background: #0f0f0f;
          border: 1px solid #222;
          margin-bottom: 2rem;
        }
        .guide-article__related-title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #666;
          text-transform: uppercase;
          margin: 0 0 1rem;
        }
        .guide-article__related-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
        }
        .guide-article__related-list li {
          padding: 0.35rem 0;
        }
        .guide-article__related-list a {
          color: #888;
          text-decoration: none;
          font-size: 0.9rem;
        }
        .guide-article__related-list a:hover {
          color: var(--text);
        }
        .guide-article__related-all {
          font-size: 0.8rem;
          color: #666;
          text-decoration: none;
        }
        .guide-article__related-all:hover {
          color: var(--text);
        }

        .guide-article__footer {
          text-align: center;
          padding: 2rem;
          border-top: 1px solid #222;
        }
        .guide-article__footer p {
          font-size: 0.9rem;
          color: var(--gray);
          margin: 0 0 1rem;
        }
        .guide-article__footer-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }
        .guide-article__footer-btn {
          padding: 0.75rem 1.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          background: var(--white);
          color: var(--black);
          text-decoration: none;
        }
        .guide-article__footer-link {
          padding: 0.75rem 1.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--gray);
          text-decoration: none;
          border: 1px solid #333;
        }
        .guide-article__footer-link:hover {
          color: var(--text);
          border-color: #555;
        }
      `}</style>
    </>
  );
}
