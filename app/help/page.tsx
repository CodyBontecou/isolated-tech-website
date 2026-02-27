import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Help Center — ISOLATED.TECH",
  description: "Get help with our apps. Find answers to common questions and troubleshooting guides.",
};

interface HelpArticle {
  id: string;
  app_id: string | null;
  app_name: string | null;
  app_icon: string | null;
  slug: string;
  title: string;
  body: string;
  category: string;
}

async function getHelpArticles(): Promise<HelpArticle[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<HelpArticle>(
    `SELECT 
       h.id,
       h.app_id,
       a.name as app_name,
       a.icon_url as app_icon,
       h.slug,
       h.title,
       h.body,
       h.category
     FROM help_articles h
     LEFT JOIN apps a ON h.app_id = a.id
     WHERE h.is_published = 1
     ORDER BY h.category, h.sort_order, h.title`,
    [],
    env
  );
}

function groupByCategory(articles: HelpArticle[]): Map<string, HelpArticle[]> {
  const groups = new Map<string, HelpArticle[]>();
  for (const article of articles) {
    const category = article.category || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(article);
  }
  return groups;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  "getting-started": "Getting Started",
  faq: "FAQ",
  troubleshooting: "Troubleshooting",
  billing: "Billing & Payments",
};

export default async function HelpPage() {
  const env = getEnv();
  const [user, articles] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getHelpArticles(),
  ]);

  const groupedArticles = groupByCategory(articles);

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

      {/* HEADER */}
      <header className="help-header">
        <h1 className="help-header__title">Help Center</h1>
        <p className="help-header__subtitle">
          Find answers to common questions or{" "}
          <a href="/feedback" className="help-header__link">submit a request</a>.
        </p>
      </header>

      {/* MAIN CONTENT */}
      <main className="help-main">
        {articles.length === 0 ? (
          <div className="help-empty">
            <p>No help articles yet.</p>
            <p>Have a question? <a href="/feedback">Submit it here</a> and we'll get back to you.</p>
          </div>
        ) : (
          <div className="help-categories">
            {Array.from(groupedArticles.entries()).map(([category, categoryArticles]) => (
              <section key={category} className="help-category">
                <h2 className="help-category__title">
                  {CATEGORY_LABELS[category] || category}
                </h2>
                <div className="help-category__list">
                  {categoryArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/help/${article.slug}`}
                      className="help-article-card"
                    >
                      <div className="help-article-card__content">
                        <h3 className="help-article-card__title">{article.title}</h3>
                        {article.app_name && (
                          <span className="help-article-card__app">
                            {article.app_icon && (
                              <img src={article.app_icon} alt="" className="help-article-card__app-icon" />
                            )}
                            {article.app_name}
                          </span>
                        )}
                      </div>
                      <span className="help-article-card__arrow">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* CONTACT CTA */}
        <section className="help-contact">
          <h2 className="help-contact__title">Can't find what you're looking for?</h2>
          <p className="help-contact__text">
            Submit a support request and we'll get back to you as soon as possible.
          </p>
          <div className="help-contact__actions">
            <a href="/feedback" className="help-contact__btn help-contact__btn--primary">
              SUBMIT REQUEST
            </a>
            <a href="mailto:cody@isolated.tech" className="help-contact__btn help-contact__btn--secondary">
              EMAIL US
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="store-footer">
        <div className="store-footer__brand">
          <span className="store-footer__logo">
            ISOLATED<span className="dot">.</span>TECH
          </span>
          <span className="store-footer__tagline">Software that ships.</span>
        </div>
        <div className="store-footer__links">
          <a href="/feedback">FEEDBACK</a>
          <a href="/roadmap">ROADMAP</a>
          <a href="/help">HELP</a>
          <Link href="/privacy">PRIVACY</Link>
          <Link href="/terms">TERMS</Link>
        </div>
        <div className="store-footer__copy">
          © 2026 ISOLATED.TECH
        </div>
      </footer>
    </>
  );
}
