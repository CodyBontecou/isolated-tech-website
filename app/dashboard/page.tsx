import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Dashboard — ISOLATED.TECH",
  description: "View your purchased apps and downloads.",
};

interface Purchase {
  id: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  app_icon_url: string | null;
  purchased_at: string;
  amount_cents: number;
  version: string;
  version_id: string;
  has_review: boolean;
  distribution_type: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

function PurchasedAppCard({
  purchase,
  isNew,
}: {
  purchase: Purchase;
  isNew?: boolean;
}) {
  return (
    <div className={`purchased-card ${isNew ? "purchased-card--new" : ""}`}>
      <div className="purchased-card__header">
        <div className="purchased-card__icon">
          {purchase.app_icon_url ? (
            <img src={purchase.app_icon_url} alt={`${purchase.app_name} icon`} />
          ) : (
            purchase.app_name[0].toUpperCase()
          )}
        </div>
        <div className="purchased-card__info">
          <h3 className="purchased-card__name">{purchase.app_name}</h3>
          <p className="purchased-card__meta">
            v{purchase.version} • Purchased {formatDate(purchase.purchased_at)}
          </p>
        </div>
      </div>

      <div className="purchased-card__actions">
        <a
          href={`/api/download/${purchase.app_id}/${purchase.version_id}`}
          className="purchased-card__btn"
        >
          {purchase.distribution_type === "source_code"
            ? `↓ DOWNLOAD SOURCE v${purchase.version}`
            : `↓ DOWNLOAD v${purchase.version}`}
        </a>

        {purchase.has_review ? (
          <Link
            href={`/dashboard/reviews/${purchase.app_id}`}
            className="purchased-card__btn purchased-card__btn--secondary"
          >
            VIEW YOUR REVIEW
          </Link>
        ) : (
          <Link
            href={`/dashboard/reviews/new?app=${purchase.app_slug}`}
            className="purchased-card__btn purchased-card__btn--secondary"
          >
            ★ WRITE A REVIEW
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { purchased?: string };
}) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  // If not logged in, show login prompt
  if (!user) {
    return (
      <>
        <nav className="nav">
          <Link href="/" className="nav__logo">
            ISOLATED<span className="dot">.</span>TECH
          </Link>
          <div className="nav__links">
            <Link href="/apps">APPS</Link>
            <Link href="/auth/login">SIGN IN</Link>
          </div>
        </nav>

        <main className="dashboard">
          <div className="auth-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div className="auth-card__header">
              <h1 className="auth-card__title">Sign In Required</h1>
              <p className="auth-card__subtitle">
                Please sign in to access your dashboard and purchased apps.
              </p>
            </div>

            <Link
              href="/auth/login"
              className="auth-btn"
              style={{ display: "block", textAlign: "center" }}
            >
              SIGN IN
            </Link>

            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <Link
                href="/apps"
                style={{ color: "var(--gray)", fontSize: "0.8rem" }}
              >
                Or browse our apps →
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Fetch user's purchases from database
  let purchases: Purchase[] = [];
  if (env?.DB) {
    try {
      const result = await env.DB.prepare(`
        SELECT 
          p.id,
          p.app_id,
          a.name as app_name,
          a.slug as app_slug,
          a.icon_url as app_icon_url,
          COALESCE(a.distribution_type, 'binary') as distribution_type,
          p.created_at as purchased_at,
          p.amount_cents,
          v.version,
          v.id as version_id,
          CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_review
        FROM purchases p
        JOIN apps a ON p.app_id = a.id
        JOIN app_versions v ON p.version_id = v.id
        LEFT JOIN reviews r ON r.user_id = p.user_id AND r.app_id = p.app_id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `).bind(user.id).all<{
        id: string;
        app_id: string;
        app_name: string;
        app_slug: string;
        app_icon_url: string | null;
        distribution_type: string;
        purchased_at: string;
        amount_cents: number;
        version: string;
        version_id: string;
        has_review: number;
      }>();
      
      purchases = result.results.map(p => ({
        ...p,
        has_review: p.has_review === 1
      }));
    } catch (err) {
      console.error("Failed to fetch purchases:", err);
    }
  }
  const newlyPurchased = searchParams.purchased;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/apps">APPS</Link>
          <Link href="/api/auth/logout">SIGN OUT</Link>
        </div>
      </nav>

      <main className="dashboard">
        <header className="dashboard__header">
          <p className="dashboard__welcome">WELCOME BACK</p>
          <h1 className="dashboard__title">
            {user.name || user.email.split("@")[0]}
            <span className="dot">.</span>
          </h1>

          <nav className="dashboard__nav">
            <Link href="/dashboard" className="dashboard__nav-link dashboard__nav-link--active">
              MY APPS
            </Link>
            <Link href="/dashboard/reviews" className="dashboard__nav-link">
              REVIEWS
            </Link>
            <Link href="/dashboard/settings" className="dashboard__nav-link">
              SETTINGS
            </Link>
          </nav>
        </header>

        {newlyPurchased && (
          <div className="dashboard__success">
            <span className="dashboard__success-icon">✓</span>
            <span className="dashboard__success-text">
              Thank you for your purchase! Your download is ready below.
            </span>
          </div>
        )}

        {purchases.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No purchases yet</h2>
            <p className="empty-state__text">
              You haven&apos;t purchased any apps yet. Check out our catalog to
              find something you&apos;ll love.
            </p>
            <Link href="/apps" className="auth-btn" style={{ display: "inline-block" }}>
              BROWSE APPS
            </Link>
          </div>
        ) : (
          <>
            <h2 className="dashboard__section-title">
              YOUR APPS ({purchases.length})
            </h2>
            <div className="purchased-grid">
              {purchases.map((purchase) => (
                <PurchasedAppCard
                  key={purchase.id}
                  purchase={purchase}
                  isNew={purchase.app_slug === newlyPurchased}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
