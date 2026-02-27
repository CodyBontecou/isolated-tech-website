import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { AppNav, AppFooter } from "@/components/app-page";
import { FAQAccordion } from "./faq-accordion";

interface Props {
  params: Promise<{ slug: string }>;
}

interface App {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
}

interface FAQItem {
  id: string;
  slug: string;
  title: string;
  question: string | null;
  body: string;
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

async function getFAQItems(appId: string): Promise<FAQItem[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<FAQItem>(
    `SELECT id, slug, title, question, body, category, sort_order
     FROM help_articles
     WHERE app_id = ? AND article_type = 'faq' AND is_published = 1
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
    title: `FAQ — ${app.name} — ISOLATED.TECH`,
    description: `Frequently asked questions about ${app.name}`,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  "getting-started": "Getting Started",
  features: "Features",
  billing: "Billing & Payments",
  troubleshooting: "Troubleshooting",
};

function groupByCategory(items: FAQItem[]): Map<string, FAQItem[]> {
  const groups = new Map<string, FAQItem[]>();
  for (const item of items) {
    const category = item.category || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(item);
  }
  return groups;
}

export default async function FAQPage({ params }: Props) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, faqItems] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getFAQItems(app.id),
  ]);

  const groupedFAQ = groupByCategory(faqItems);

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/faq`} />

      <main className="faq-page">
        <div className="faq-page__container">
          <header className="faq-page__header">
            <Link href={`/apps/${slug}`} className="faq-page__back">
              ← Back to {app.name}
            </Link>
            <div className="faq-page__title-row">
              {app.icon_url && (
                <img src={app.icon_url} alt="" className="faq-page__app-icon" />
              )}
              <div>
                <h1 className="faq-page__title">Frequently Asked Questions</h1>
                <p className="faq-page__subtitle">{app.name}</p>
              </div>
            </div>
          </header>

          {faqItems.length === 0 ? (
            <div className="faq-empty">
              <p>No FAQ available yet.</p>
              <p>
                Have a question?{" "}
                <Link href="/feedback">Submit it here</Link> and we'll add it to our FAQ.
              </p>
            </div>
          ) : (
            <div className="faq-content">
              {Array.from(groupedFAQ.entries()).map(([category, items]) => (
                <section key={category} className="faq-section">
                  {groupedFAQ.size > 1 && (
                    <h2 className="faq-section__title">
                      {CATEGORY_LABELS[category] || category}
                    </h2>
                  )}
                  <FAQAccordion items={items.map(item => ({
                    id: item.slug,
                    question: item.question || item.title,
                    answer: item.body,
                  }))} />
                </section>
              ))}
            </div>
          )}

          <div className="faq-footer">
            <p>Still have questions?</p>
            <div className="faq-footer__actions">
              <Link href="/feedback" className="faq-footer__btn">
                Submit a Question
              </Link>
              <Link href={`/apps/${slug}/docs`} className="faq-footer__link">
                Browse Documentation
              </Link>
            </div>
          </div>
        </div>
      </main>

      <AppFooter />

      <style>{`
        .faq-page {
          min-height: 100vh;
          padding: 2rem 1.5rem;
        }
        .faq-page__container {
          max-width: 800px;
          margin: 0 auto;
        }
        .faq-page__header {
          margin-bottom: 3rem;
        }
        .faq-page__back {
          font-size: 0.75rem;
          color: var(--gray);
          text-decoration: none;
          letter-spacing: 0.05em;
        }
        .faq-page__back:hover {
          color: var(--text);
        }
        .faq-page__title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }
        .faq-page__app-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
        }
        .faq-page__title {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .faq-page__subtitle {
          font-size: 0.85rem;
          color: var(--gray);
          margin: 0.25rem 0 0;
        }

        .faq-content {
          margin-bottom: 3rem;
        }
        .faq-section {
          margin-bottom: 2.5rem;
        }
        .faq-section__title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #666;
          text-transform: uppercase;
          margin: 0 0 1rem;
        }

        .faq-empty {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
          font-size: 0.9rem;
        }
        .faq-empty a {
          color: var(--text);
        }

        .faq-footer {
          text-align: center;
          padding: 2rem;
          border-top: 1px solid #222;
        }
        .faq-footer p {
          font-size: 0.9rem;
          color: var(--gray);
          margin: 0 0 1rem;
        }
        .faq-footer__actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .faq-footer__btn {
          padding: 0.75rem 1.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          background: var(--white);
          color: var(--black);
          text-decoration: none;
        }
        .faq-footer__link {
          padding: 0.75rem 1.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--gray);
          text-decoration: none;
          border: 1px solid #333;
        }
        .faq-footer__link:hover {
          color: var(--text);
          border-color: #555;
        }
      `}</style>
    </>
  );
}
