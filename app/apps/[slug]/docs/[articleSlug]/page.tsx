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

interface DocArticle {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string;
  sort_order: number;
  updated_at: string;
}

interface DocNavItem {
  id: string;
  slug: string;
  title: string;
  category: string;
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

async function getDocArticle(appId: string, articleSlug: string): Promise<DocArticle | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<DocArticle>(
    `SELECT id, slug, title, body, category, sort_order, updated_at
     FROM help_articles
     WHERE app_id = ? AND slug = ? AND article_type = 'docs' AND is_published = 1`,
    [appId, articleSlug],
    env
  );
}

async function getDocNav(appId: string): Promise<DocNavItem[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<DocNavItem>(
    `SELECT id, slug, title, category
     FROM help_articles
     WHERE app_id = ? AND article_type = 'docs' AND is_published = 1
     ORDER BY category, sort_order, title`,
    [appId],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "Not Found — ISOLATED.TECH" };

  const article = await getDocArticle(app.id, articleSlug);
  if (!article) return { title: "Not Found — ISOLATED.TECH" };

  return {
    title: `${article.title} — ${app.name} Docs — ISOLATED.TECH`,
    description: article.body.slice(0, 160).replace(/[#*_]/g, ""),
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  "getting-started": "Getting Started",
  features: "Features",
  integration: "Integration",
  troubleshooting: "Troubleshooting",
};

function groupByCategory(articles: DocNavItem[]): Map<string, DocNavItem[]> {
  const groups = new Map<string, DocNavItem[]>();
  for (const article of articles) {
    const category = article.category || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(article);
  }
  return groups;
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
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<'))
    .map(p => `<p>${p}</p>`)
    .join('');
}

export default async function DocArticlePage({ params }: Props) {
  const { slug, articleSlug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, article, navItems] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getDocArticle(app.id, articleSlug),
    getDocNav(app.id),
  ]);

  if (!article) {
    notFound();
  }

  const groupedNav = groupByCategory(navItems);

  // Find prev/next articles
  const flatNav = navItems;
  const currentIndex = flatNav.findIndex((a) => a.slug === articleSlug);
  const prevArticle = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const nextArticle = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/docs/${articleSlug}`} />

      <main className="docs-layout">
        {/* Sidebar */}
        <aside className="docs-sidebar">
          <Link href={`/apps/${slug}`} className="docs-sidebar__app">
            {app.icon_url && (
              <img src={app.icon_url} alt="" className="docs-sidebar__app-icon" />
            )}
            <span>{app.name}</span>
          </Link>

          <nav className="docs-sidebar__nav">
            {Array.from(groupedNav.entries()).map(([category, articles]) => (
              <div key={category} className="docs-sidebar__section">
                <h3 className="docs-sidebar__section-title">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <ul className="docs-sidebar__list">
                  {articles.map((navArticle) => (
                    <li key={navArticle.id}>
                      <Link
                        href={`/apps/${slug}/docs/${navArticle.slug}`}
                        className={`docs-sidebar__link ${navArticle.slug === articleSlug ? "docs-sidebar__link--active" : ""}`}
                      >
                        {navArticle.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="docs-sidebar__links">
            <Link href={`/apps/${slug}/faq`} className="docs-sidebar__extra">
              FAQ
            </Link>
            <Link href="/feedback" className="docs-sidebar__extra">
              Feedback
            </Link>
          </div>
        </aside>

        {/* Content */}
        <article className="docs-content">
          <header className="docs-content__header">
            <span className="docs-content__category">
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
            <h1 className="docs-content__title">{article.title}</h1>
            <p className="docs-content__updated">
              Last updated:{" "}
              {new Date(article.updated_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </header>

          <div
            className="docs-content__body"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(article.body) }}
          />

          {/* Prev/Next navigation */}
          <nav className="docs-content__nav">
            {prevArticle ? (
              <Link href={`/apps/${slug}/docs/${prevArticle.slug}`} className="docs-content__nav-link docs-content__nav-link--prev">
                <span className="docs-content__nav-label">Previous</span>
                <span className="docs-content__nav-title">{prevArticle.title}</span>
              </Link>
            ) : (
              <div />
            )}
            {nextArticle && (
              <Link href={`/apps/${slug}/docs/${nextArticle.slug}`} className="docs-content__nav-link docs-content__nav-link--next">
                <span className="docs-content__nav-label">Next</span>
                <span className="docs-content__nav-title">{nextArticle.title}</span>
              </Link>
            )}
          </nav>
        </article>
      </main>

      <AppFooter />

      <style>{`
        .docs-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
        }
        @media (max-width: 768px) {
          .docs-layout {
            grid-template-columns: 1fr;
          }
          .docs-sidebar {
            display: none;
          }
        }

        /* Sidebar */
        .docs-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          padding: 1.5rem;
          border-right: 1px solid #222;
          background: #0a0a0a;
        }
        .docs-sidebar__app {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          padding-bottom: 1rem;
          border-bottom: 1px solid #222;
          margin-bottom: 1.5rem;
        }
        .docs-sidebar__app-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
        }
        .docs-sidebar__nav {
          flex: 1;
        }
        .docs-sidebar__section {
          margin-bottom: 1.5rem;
        }
        .docs-sidebar__section-title {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #666;
          text-transform: uppercase;
          margin: 0 0 0.5rem;
        }
        .docs-sidebar__list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .docs-sidebar__link {
          display: block;
          font-size: 0.85rem;
          color: #888;
          text-decoration: none;
          padding: 0.35rem 0;
          transition: color 0.15s;
        }
        .docs-sidebar__link:hover {
          color: var(--text);
        }
        .docs-sidebar__link--active {
          color: var(--text);
          font-weight: 600;
        }
        .docs-sidebar__links {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #222;
          display: flex;
          gap: 1rem;
        }
        .docs-sidebar__extra {
          font-size: 0.75rem;
          color: #666;
          text-decoration: none;
        }
        .docs-sidebar__extra:hover {
          color: var(--text);
        }

        /* Content */
        .docs-content {
          padding: 2rem 3rem;
          max-width: 800px;
        }
        @media (max-width: 768px) {
          .docs-content {
            padding: 1.5rem;
          }
        }
        .docs-content__header {
          margin-bottom: 2rem;
        }
        .docs-content__category {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: #666;
          text-transform: uppercase;
        }
        .docs-content__title {
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0.5rem 0 0;
        }
        .docs-content__updated {
          font-size: 0.8rem;
          color: #666;
          margin: 0.5rem 0 0;
        }
        .docs-content__body {
          font-size: 0.95rem;
          line-height: 1.7;
          color: #ccc;
        }
        .docs-content__body h1,
        .docs-content__body h2,
        .docs-content__body h3 {
          color: var(--text);
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .docs-content__body h2 {
          font-size: 1.4rem;
        }
        .docs-content__body h3 {
          font-size: 1.1rem;
        }
        .docs-content__body p {
          margin: 0 0 1rem;
        }
        .docs-content__body code {
          background: #1a1a1a;
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          font-size: 0.85em;
        }
        .docs-content__body pre {
          background: #1a1a1a;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .docs-content__body pre code {
          background: none;
          padding: 0;
        }
        .docs-content__body ul {
          padding-left: 1.5rem;
          margin: 0 0 1rem;
        }
        .docs-content__body a {
          color: #60a5fa;
        }
        .docs-content__body a:hover {
          text-decoration: underline;
        }

        /* Prev/Next */
        .docs-content__nav {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #222;
        }
        .docs-content__nav-link {
          display: block;
          padding: 1rem;
          border: 1px solid #333;
          text-decoration: none;
          transition: border-color 0.15s;
        }
        .docs-content__nav-link:hover {
          border-color: #555;
        }
        .docs-content__nav-link--next {
          text-align: right;
        }
        .docs-content__nav-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }
        .docs-content__nav-title {
          color: var(--text);
          font-weight: 500;
        }
      `}</style>
    </>
  );
}
