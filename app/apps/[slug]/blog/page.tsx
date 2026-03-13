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

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string | null;
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

async function getBlogPosts(appId: string): Promise<BlogPost[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<BlogPost>(
    `SELECT id, slug, title, excerpt, cover_image_url, author_name, published_at
     FROM app_blog_posts
     WHERE app_id = ? AND is_published = 1
     ORDER BY published_at DESC`,
    [appId],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "Not Found — ISOLATED.TECH" };

  return {
    title: `Blog — ${app.name} — ISOLATED.TECH`,
    description: `Latest news, updates, and guides for ${app.name}`,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogIndexPage({ params }: Props) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, posts] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getBlogPosts(app.id),
  ]);

  return (
    <>
      <AppNav user={user} redirectPath={`/apps/${slug}/blog`} />

      <main className="blog-page">
        <header className="blog-header">
          <Link href={`/apps/${slug}`} className="blog-header__back">
            <span className="blog-header__back-icon">←</span>
            <span className="blog-header__back-text">{app.name}</span>
          </Link>
          <h1 className="blog-header__title">Blog</h1>
          <p className="blog-header__subtitle">
            Latest news, updates, and guides
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="blog-empty">
            <p>No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="blog-grid">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/apps/${slug}/blog/${post.slug}`}
                className="blog-card"
              >
                {post.cover_image_url && (
                  <div className="blog-card__image">
                    <img src={post.cover_image_url} alt="" />
                  </div>
                )}
                <div className="blog-card__content">
                  <time className="blog-card__date">{formatDate(post.published_at)}</time>
                  <h2 className="blog-card__title">{post.title}</h2>
                  {post.excerpt && <p className="blog-card__excerpt">{post.excerpt}</p>}
                  {post.author_name && (
                    <p className="blog-card__author">By {post.author_name}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <AppFooter />

      <style>{`
        .blog-page {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 2rem 4rem;
        }

        .blog-header {
          padding: 6rem 0 3rem;
          border-bottom: 1px solid #222;
          margin-bottom: 3rem;
        }

        .blog-header__back {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-decoration: none;
          margin-bottom: 1.25rem;
          transition: color 0.15s ease;
        }

        .blog-header__back:hover {
          color: var(--text);
        }

        .blog-header__back-icon {
          font-size: 1.1rem;
        }

        .blog-header__title {
          font-size: clamp(2.25rem, 5vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0 0 0.75rem;
          line-height: 1.1;
        }

        .blog-header__subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.6;
        }

        .blog-empty {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-secondary);
        }

        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .blog-card {
          display: flex;
          flex-direction: column;
          background: transparent;
          border: 1px solid #2a2a2a;
          text-decoration: none;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .blog-card:hover {
          border-color: #444;
          transform: translateY(-2px);
        }

        .blog-card__image {
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border-bottom: 1px solid #2a2a2a;
        }

        .blog-card__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .blog-card:hover .blog-card__image img {
          transform: scale(1.03);
        }

        .blog-card__content {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .blog-card__date {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        .blog-card__title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.35;
          margin: 0 0 0.85rem;
        }

        .blog-card__excerpt {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.65;
          margin: 0 0 auto;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blog-card__author {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 1rem 0 0;
          padding-top: 1rem;
          border-top: 1px solid #222;
        }

        @media (max-width: 700px) {
          .blog-page {
            padding: 0 1.25rem 3rem;
          }

          .blog-header {
            padding: 5rem 0 2rem;
          }

          .blog-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
      `}</style>
    </>
  );
}
