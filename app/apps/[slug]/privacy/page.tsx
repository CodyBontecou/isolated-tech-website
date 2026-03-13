import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queryOne } from "@/lib/db";
import { SiteNav } from "@/components/site-nav";

interface App {
  id: string;
  slug: string;
  name: string;
  privacy_policy: string | null;
}

async function getApp(slug: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<App>(
    `SELECT id, slug, name, privacy_policy FROM apps WHERE slug = ? AND is_published = 1`,
    [slug],
    env
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "Not Found" };

  return {
    title: `Privacy Policy — ${app.name} — ISOLATED.TECH`,
    description: `Privacy policy for ${app.name}`,
  };
}

function formatInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdown(content: string): string {
  const blocks = content.split(/\n\n+/);
  
  return blocks.map((block) => {
    const lines = block.split("\n");
    
    // Headers
    if (block.startsWith("### ")) {
      return `<h3>${formatInline(block.slice(4))}</h3>`;
    }
    if (block.startsWith("## ")) {
      return `<h2>${formatInline(block.slice(3))}</h2>`;
    }
    if (block.startsWith("# ")) {
      return `<h1>${formatInline(block.slice(2))}</h1>`;
    }
    
    // Unordered lists
    if (block.startsWith("- ")) {
      const items = lines
        .filter(line => line.startsWith("- "))
        .map(line => `<li>${formatInline(line.slice(2))}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    
    // Ordered lists
    if (block.match(/^\d\./)) {
      const items = lines
        .map(line => {
          const match = line.match(/^\d+\.\s*(.+)/);
          if (match) return `<li>${formatInline(match[1])}</li>`;
          return "";
        })
        .filter(Boolean)
        .join("");
      return `<ol>${items}</ol>`;
    }
    
    // Regular paragraph
    return `<p>${formatInline(block.replace(/\n/g, " "))}</p>`;
  }).join("\n");
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <SiteNav user={user} activePage="apps" />

      <main className="app-page">
        <a href={`/apps/${app.slug}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </a>

        <header style={{ marginBottom: "2rem" }}>
          <h1 className="app-page__name">
            Privacy Policy<span className="dot">.</span>
          </h1>
          <p style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
            {app.name}
          </p>
        </header>

        {app.privacy_policy ? (
          <article className="legal-content">
            <div
              className="legal-content__body"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(app.privacy_policy),
              }}
            />
          </article>
        ) : (
          <div className="legal-empty">
            <p className="legal-empty__text">No privacy policy available.</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>

      <style>{`
        .legal-content {
          max-width: 720px;
        }
        .legal-content__body {
          line-height: 1.7;
        }
        .legal-content__body h1 {
          font-size: 1.5rem;
          margin: 2rem 0 1rem;
          font-weight: 600;
        }
        .legal-content__body h2 {
          font-size: 1.25rem;
          margin: 1.5rem 0 0.75rem;
          font-weight: 600;
        }
        .legal-content__body h3 {
          font-size: 1.1rem;
          margin: 1.25rem 0 0.5rem;
          font-weight: 600;
        }
        .legal-content__body p {
          margin: 0.75rem 0;
          color: var(--gray);
        }
        .legal-content__body ul,
        .legal-content__body ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
          color: var(--gray);
        }
        .legal-content__body li {
          margin: 0.25rem 0;
        }
        .legal-content__body a {
          color: var(--foreground);
          text-decoration: underline;
        }
        .legal-content__body strong {
          font-weight: 600;
          color: var(--foreground);
        }
        .legal-content__body code {
          background: var(--gray-light);
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-size: 0.9em;
        }
        .legal-empty {
          padding: 3rem;
          text-align: center;
          border: 1px dashed var(--border);
          border-radius: 8px;
        }
        .legal-empty__text {
          color: var(--gray);
        }
      `}</style>
    </>
  );
}
