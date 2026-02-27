import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";

interface Props {
  params: Promise<{ slug: string }>;
}

interface HelpArticle {
  id: string;
  app_id: string | null;
  app_name: string | null;
  app_slug: string | null;
  app_icon: string | null;
  slug: string;
  title: string;
  body: string;
  category: string;
  updated_at: string;
}

async function getHelpArticle(slug: string): Promise<HelpArticle | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<HelpArticle>(
    `SELECT 
       h.id,
       h.app_id,
       a.name as app_name,
       a.slug as app_slug,
       a.icon_url as app_icon,
       h.slug,
       h.title,
       h.body,
       h.category,
       h.updated_at
     FROM help_articles h
     LEFT JOIN apps a ON h.app_id = a.id
     WHERE h.slug = ? AND h.is_published = 1 AND (h.article_type = 'help' OR h.article_type IS NULL)`,
    [slug],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getHelpArticle(slug);
  
  if (!article) {
    return { title: "Not Found — ISOLATED.TECH" };
  }

  return {
    title: `${article.title} — Help — ISOLATED.TECH`,
    description: article.body.slice(0, 160).replace(/[#*_]/g, ''),
  };
}

function parseMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Paragraphs
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<'))
    .map(p => `<p>${p}</p>`)
    .join('');
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const env = getEnv();
  const [user, article] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getHelpArticle(slug),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/#apps">APPS</a>
          <a href="/feedback">FEEDBACK</a>
          <a href="/roadmap">ROADMAP</a>
          {user ? (
            <>
              {user.isAdmin && <a href="/admin">ADMIN</a>}
              <a href="/dashboard">DASHBOARD</a>
              <SignOutButton />
            </>
          ) : (
            <a href="/auth/login">SIGN IN</a>
          )}
        </div>
      </nav>

      {/* MAIN */}
      <main className="help-article">
        <div className="help-article__container">
          <Link href="/help" className="help-article__back">
            ← Back to Help Center
          </Link>

          <article className="help-article__content">
            <header className="help-article__header">
              {article.app_name && (
                <Link href={`/apps/${article.app_slug}`} className="help-article__app">
                  {article.app_icon && (
                    <img src={article.app_icon} alt="" className="help-article__app-icon" />
                  )}
                  {article.app_name}
                </Link>
              )}
              <h1 className="help-article__title">{article.title}</h1>
              <p className="help-article__updated">
                Last updated: {new Date(article.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </header>

            <div 
              className="help-article__body"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(article.body) }}
            />
          </article>

          {/* Related Help */}
          <div className="help-article__footer">
            <p>Still need help?</p>
            <div className="help-article__footer-actions">
              <a href="/feedback" className="help-article__footer-btn">
                Submit a Request
              </a>
              <a href="mailto:cody@isolated.tech" className="help-article__footer-link">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </>
  );
}
