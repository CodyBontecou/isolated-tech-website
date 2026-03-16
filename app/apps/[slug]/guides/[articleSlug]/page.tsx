import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { AppNav, AppFooter } from "@/components/app-page";

// Custom styled articles that should redirect to their blog versions
const CUSTOM_STYLED_ARTICLES: Record<string, string[]> = {
  syncmd: ["obsidian-git-ios-setup"],
};

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

  // Redirect to custom styled blog version if available
  if (CUSTOM_STYLED_ARTICLES[slug]?.includes(articleSlug)) {
    redirect(`/apps/${slug}/blog/${articleSlug}`);
  }

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
              <Link href={`/feedback?app=${slug}`} className="guide-article__footer-btn">
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
          padding: 6rem 1.5rem 3rem;
        }

        .guide-article__container {
          max-width: 820px;
          margin: 0 auto;
        }

        .guide-article__back {
          font-size: 0.82rem;
          color: var(--text-secondary);
          text-decoration: none;
          letter-spacing: 0.06em;
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
          gap: 0.55rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-decoration: none;
          margin-bottom: 0.85rem;
        }

        .guide-article__app:hover {
          color: var(--text);
        }

        .guide-article__app-icon {
          width: 22px;
          height: 22px;
          border-radius: 5px;
        }

        .guide-article__title {
          font-size: clamp(2rem, 4vw, 2.5rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.08;
          margin: 0;
        }

        .guide-article__updated {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin: 0.9rem 0 0;
        }

        .guide-article__body {
          font-size: 1rem;
          line-height: 1.9;
          color: var(--text-secondary);
        }

        .guide-article__body h1,
        .guide-article__body h2,
        .guide-article__body h3 {
          color: var(--text);
          margin-top: 2.2rem;
          margin-bottom: 0.85rem;
          line-height: 1.25;
        }

        .guide-article__body h2 {
          font-size: 1.38rem;
        }

        .guide-article__body h3 {
          font-size: 1.12rem;
        }

        .guide-article__body p,
        .guide-article__body ul,
        .guide-article__body ol {
          margin: 0 0 1.1rem;
        }

        .guide-article__body ul,
        .guide-article__body ol {
          padding-left: 1.5rem;
        }

        .guide-article__body li {
          margin-bottom: 0.45rem;
        }

        .guide-article__body code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-size: 0.86em;
          color: var(--text);
        }

        .guide-article__body pre {
          background: #141414;
          border: 1px solid #2e2e2e;
          padding: 1rem 1.15rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.2rem 0;
        }

        .guide-article__body pre code {
          background: none;
          padding: 0;
        }

        .guide-article__body a {
          color: var(--text);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .guide-article__body a:hover {
          opacity: 0.82;
        }

        .guide-article__related {
          padding: 1.5rem;
          background: var(--bg-elevated);
          border: 1px solid #2f2f2f;
          margin-bottom: 2rem;
        }

        .guide-article__related-title {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin: 0 0 1rem;
        }

        .guide-article__related-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
        }

        .guide-article__related-list li {
          padding: 0.45rem 0;
        }

        .guide-article__related-list a,
        .guide-article__related-all {
          color: var(--text-secondary);
          text-decoration: none;
        }

        .guide-article__related-list a {
          font-size: 0.96rem;
          line-height: 1.5;
        }

        .guide-article__related-list a:hover,
        .guide-article__related-all:hover {
          color: var(--text);
        }

        .guide-article__related-all {
          font-size: 0.88rem;
        }

        .guide-article__footer {
          text-align: center;
          padding: 2rem 0 0;
          border-top: 1px solid #222;
        }

        .guide-article__footer p {
          font-size: 0.98rem;
          color: var(--text-secondary);
          margin: 0 0 1rem;
          line-height: 1.7;
        }

        .guide-article__footer-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .guide-article__footer-btn,
        .guide-article__footer-link {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.8rem 1.45rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-decoration: none;
        }

        .guide-article__footer-btn {
          background: var(--white);
          color: var(--black);
        }

        .guide-article__footer-link {
          color: var(--text-secondary);
          border: 1px solid #333;
        }

        .guide-article__footer-link:hover {
          color: var(--text);
          border-color: #555;
          background: rgba(255, 255, 255, 0.03);
        }

        @media (max-width: 600px) {
          .guide-article {
            padding: 5.5rem 1.25rem 2.5rem;
          }

          .guide-article__back,
          .guide-article__app,
          .guide-article__updated,
          .guide-article__body,
          .guide-article__related-list a,
          .guide-article__related-all,
          .guide-article__footer p,
          .guide-article__footer-btn,
          .guide-article__footer-link {
            font-size: 0.92rem;
          }
        }
      `}</style>
    </>
  );
}
