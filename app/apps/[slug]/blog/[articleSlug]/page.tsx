import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string;
  updated_at: string;
}

interface BlogPostPreview {
  id: string;
  slug: string;
  title: string;
  published_at: string;
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

async function getBlogPost(appId: string, articleSlug: string): Promise<BlogPost | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<BlogPost>(
    `SELECT id, slug, title, excerpt, body, cover_image_url, author_name, published_at, updated_at
     FROM app_blog_posts
     WHERE app_id = ? AND slug = ? AND is_published = 1`,
    [appId, articleSlug],
    env
  );
}

async function getRelatedPosts(appId: string, currentPostId: string): Promise<BlogPostPreview[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<BlogPostPreview>(
    `SELECT id, slug, title, published_at
     FROM app_blog_posts
     WHERE app_id = ? AND id != ? AND is_published = 1
     ORDER BY published_at DESC
     LIMIT 3`,
    [appId, currentPostId],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "Not Found — ISOLATED.TECH" };

  const post = await getBlogPost(app.id, articleSlug);
  if (!post) return { title: "Not Found — ISOLATED.TECH" };

  return {
    title: `${post.title} — ${app.name} Blog — ISOLATED.TECH`,
    description: post.excerpt || post.body.slice(0, 160).replace(/[#*_]/g, ""),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.body.slice(0, 160).replace(/[#*_]/g, ""),
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      ...(post.cover_image_url && { images: [post.cover_image_url] }),
    },
  };
}

function parseMarkdown(text: string): string {
  // Parse tables first (before other transformations)
  const parseTable = (input: string): string => {
    const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n)+)/g;
    return input.replace(tableRegex, (match, tableBlock) => {
      const lines = tableBlock.trim().split('\n');
      if (lines.length < 2) return match;
      
      // Check if second line is separator (|---|---|)
      const separatorLine = lines[1];
      if (!/^\|[\s\-:|]+\|$/.test(separatorLine)) return match;
      
      const parseRow = (row: string): string[] => {
        return row.split('|').slice(1, -1).map(cell => cell.trim());
      };
      
      const headerCells = parseRow(lines[0]);
      const thead = `<thead><tr>${headerCells.map(cell => `<th>${cell}</th>`).join('')}</tr></thead>`;
      
      const bodyRows = lines.slice(2).map(row => {
        const cells = parseRow(row);
        return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
      }).join('');
      const tbody = `<tbody>${bodyRows}</tbody>`;
      
      return `\n<table>${thead}${tbody}</table>\n`;
    });
  };

  let result = parseTable(text);
  
  return result
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="blog-img" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/(<blockquote>.*<\/blockquote>\n?)+/g, (match) => 
      '<blockquote>' + match.replace(/<\/?blockquote>/g, '').trim() + '</blockquote>'
    )
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p)
    .map(p => p.startsWith('<') ? p : `<p>${p}</p>`)
    .join('');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug, articleSlug } = await params;

  // Handle legacy .html URLs
  if (articleSlug.endsWith('.html')) {
    redirect(`/apps/${slug}/blog/${articleSlug.replace(/\.html$/, '')}`);
  }

  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, post] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getBlogPost(app.id, articleSlug),
  ]);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(app.id, post.id);

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/blog/${articleSlug}`} />

      <main className="blog-article">
        <article className="blog-article__content">
          <header className="blog-article__header">
            <Link href={`/apps/${slug}/blog`} className="blog-article__back">
              ← Back to Blog
            </Link>
            <time className="blog-article__date">{formatDate(post.published_at)}</time>
            <h1 className="blog-article__title">{post.title}</h1>
            {post.excerpt && (
              <p className="blog-article__excerpt">{post.excerpt}</p>
            )}
            {post.author_name && (
              <p className="blog-article__author">By {post.author_name}</p>
            )}
          </header>

          {post.cover_image_url && (
            <div className="blog-article__cover">
              <img src={post.cover_image_url} alt="" />
            </div>
          )}

          <div
            className="blog-article__body"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(post.body) }}
          />

          <footer className="blog-article__footer">
            <Link href={`/apps/${slug}`} className="blog-article__cta">
              Learn more about {app.name} →
            </Link>
          </footer>
        </article>

        {relatedPosts.length > 0 && (
          <aside className="blog-article__related">
            <h2 className="blog-article__related-title">More Posts</h2>
            <ul className="blog-article__related-list">
              {relatedPosts.map((relatedPost) => (
                <li key={relatedPost.id}>
                  <Link
                    href={`/apps/${slug}/blog/${relatedPost.slug}`}
                    className="blog-article__related-link"
                  >
                    <span className="blog-article__related-link-title">
                      {relatedPost.title}
                    </span>
                    <time className="blog-article__related-link-date">
                      {formatDate(relatedPost.published_at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>

      <AppFooter />

      <style>{`
        .blog-article {
          max-width: 780px;
          margin: 0 auto;
          padding: 0 2rem 4rem;
        }

        .blog-article__content {
          padding-top: 6rem;
        }

        .blog-article__header {
          margin-bottom: 2.5rem;
        }

        .blog-article__back {
          display: inline-block;
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-decoration: none;
          margin-bottom: 1.5rem;
          transition: color 0.15s ease;
        }

        .blog-article__back:hover {
          color: var(--text);
        }

        .blog-article__date {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 1rem;
        }

        .blog-article__title {
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 0 0 1.25rem;
        }

        .blog-article__excerpt {
          font-size: 1.15rem;
          color: var(--text-secondary);
          line-height: 1.65;
          margin: 0 0 1rem;
        }

        .blog-article__author {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .blog-article__cover {
          margin: 0 -2rem 2.5rem;
          border-radius: 0;
          overflow: hidden;
        }

        .blog-article__cover img {
          width: 100%;
          height: auto;
          display: block;
        }

        .blog-article__body {
          font-size: 1.05rem;
          line-height: 1.85;
          color: var(--text-secondary);
        }

        .blog-article__body h1,
        .blog-article__body h2,
        .blog-article__body h3 {
          color: var(--text);
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.3;
        }

        .blog-article__body h2 {
          font-size: 1.5rem;
          letter-spacing: -0.01em;
        }

        .blog-article__body h3 {
          font-size: 1.2rem;
        }

        .blog-article__body p {
          margin: 0 0 1.35rem;
        }

        .blog-article__body ul,
        .blog-article__body ol {
          margin: 0 0 1.35rem;
          padding-left: 1.5rem;
        }

        .blog-article__body li {
          margin-bottom: 0.5rem;
        }

        .blog-article__body strong {
          color: var(--text);
          font-weight: 600;
        }

        .blog-article__body code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.2rem 0.45rem;
          border-radius: 4px;
          font-size: 0.88em;
          color: var(--text);
        }

        .blog-article__body pre {
          background: #141414;
          border: 1px solid #2e2e2e;
          padding: 1.25rem 1.35rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .blog-article__body pre code {
          background: none;
          padding: 0;
        }

        .blog-article__body blockquote {
          margin: 1.5rem 0;
          padding: 0 0 0 1.25rem;
          border-left: 3px solid #444;
          color: var(--text);
          font-style: italic;
        }

        .blog-article__body a {
          color: var(--text);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.15s ease;
        }

        .blog-article__body a:hover {
          opacity: 0.75;
        }

        .blog-article__body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.95rem;
        }

        .blog-article__body th,
        .blog-article__body td {
          text-align: left;
          padding: 0.75rem 1rem;
          border: 1px solid #333;
        }

        .blog-article__body th {
          background: rgba(255, 255, 255, 0.05);
          font-weight: 600;
          color: var(--text);
        }

        .blog-article__body td {
          color: var(--text-secondary);
        }

        .blog-article__body tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .blog-article__body .blog-img {
          max-width: 100%;
          height: auto;
          margin: 1.5rem 0;
          border-radius: 6px;
        }

        .blog-article__footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #2a2a2a;
        }

        .blog-article__cta {
          display: inline-block;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text);
          text-decoration: none;
          padding: 0.85rem 1.5rem;
          border: 1px solid #444;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .blog-article__cta:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #666;
        }

        .blog-article__related {
          margin-top: 3.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid #2a2a2a;
        }

        .blog-article__related-title {
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin: 0 0 1.25rem;
        }

        .blog-article__related-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .blog-article__related-link {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          padding: 1rem 0;
          text-decoration: none;
          border-bottom: 1px solid #222;
          transition: border-color 0.15s ease;
        }

        .blog-article__related-link:hover {
          border-color: #444;
        }

        .blog-article__related-link-title {
          color: var(--text);
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .blog-article__related-link-date {
          color: var(--text-secondary);
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        @media (max-width: 700px) {
          .blog-article {
            padding: 0 1.25rem 3rem;
          }

          .blog-article__content {
            padding-top: 5rem;
          }

          .blog-article__cover {
            margin: 0 -1.25rem 2rem;
          }

          .blog-article__body {
            font-size: 1rem;
          }

          .blog-article__related-link {
            flex-direction: column;
            gap: 0.35rem;
          }
        }
      `}</style>
    </>
  );
}
