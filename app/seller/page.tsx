import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queryOne, query } from "@/lib/db";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { getSellerConnectState } from "@/lib/seller-connect-status";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SellerDashboardClient } from "./seller-dashboard-client";

export const metadata: Metadata = {
  title: "Seller Dashboard — ISOLATED.TECH",
  description: "Manage your apps and earnings on ISOLATED.TECH",
};

interface SellerInfo {
  stripe_account_id: string | null;
  stripe_onboarded: number;
  is_seller: number;
}

interface SellerApp {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  is_published: number;
  min_price_cents: number;
  purchase_count: number;
  total_revenue_cents: number;
}

interface SellerStats {
  total_sales: number;
  total_revenue_cents: number;
  total_platform_fees_cents: number;
}

function SellerCliOnboardingSection() {
  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1rem",
        background: "var(--card-bg)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
      }}
    >
      <h3 style={{ marginBottom: "0.75rem", fontSize: "0.85rem", fontWeight: 600 }}>
        CLI QUICKSTART
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "0.8rem", lineHeight: 1.65 }}>
        Prefer terminal workflow? Use the isolated CLI:
      </p>
      <pre
        style={{
          margin: 0,
          padding: "0.75rem",
          background: "var(--black)",
          borderRadius: "6px",
          fontSize: "0.75rem",
          lineHeight: 1.6,
          overflowX: "auto",
        }}
      >
{`npm install -g @isolated/cli
isolated login
isolated init
isolated publish`}
      </pre>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginTop: "0.8rem", lineHeight: 1.65 }}>
        For agents/automation, append <code>--json</code> to commands.
      </p>
    </div>
  );
}

export default async function SellerPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    redirect("/auth/login?redirect=/seller");
  }

  // Get seller info
  const sellerInfo = await queryOne<SellerInfo>(
    `SELECT stripe_account_id, stripe_onboarded, is_seller FROM user WHERE id = ?`,
    [user.id],
    env
  );

  const isSeller = sellerInfo?.is_seller === 1;

  // Hybrid status model:
  // - live v2 status from Stripe for accuracy
  // - DB flag as fallback when Stripe is temporarily unavailable
  const sellerConnectState = isSeller
    ? await getSellerConnectState(env, user.id)
    : null;

  const isOnboarded = sellerConnectState?.effectiveOnboarded ?? sellerInfo?.stripe_onboarded === 1;

  // If not a seller yet, show onboarding CTA
  if (!isSeller) {
    return (
      <>
        <SiteNav user={user} />
        <main className="dashboard">
          <div className="auth-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div className="auth-card__header">
              <h1 className="auth-card__title">Become a Seller</h1>
              <p className="auth-card__subtitle">
                Sell your apps, books, and digital products on ISOLATED.TECH.
                We handle payments, delivery, and updates — you keep {100 - PLATFORM_FEE_PERCENT}% of every sale.
              </p>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 600 }}>
                HOW IT WORKS
              </h3>
              <ol style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.95rem" }}>
                <li>Connect your Stripe account to receive payments</li>
                <li>Upload your apps via our CLI or web interface</li>
                <li>Set your prices and publish when ready</li>
                <li>Get paid directly to your bank account</li>
              </ol>
            </div>

            <div style={{ 
              padding: "1rem", 
              background: "var(--card-bg)", 
              borderRadius: "8px",
              marginBottom: "1rem",
              border: "1px solid var(--border)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Platform fee</span>
                <span style={{ fontWeight: 600 }}>{PLATFORM_FEE_PERCENT}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>You keep</span>
                <span style={{ fontWeight: 600, color: "var(--accent)" }}>{100 - PLATFORM_FEE_PERCENT}%</span>
              </div>
            </div>

            <SellerCliOnboardingSection />

            <div style={{ marginTop: "1.5rem" }}>
              <SellerDashboardClient action="onboard" />
            </div>

            <p style={{ marginTop: "1.5rem", fontSize: "0.84rem", color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.7 }}>
              By becoming a seller, you agree to our{" "}
              <Link href="/terms" style={{ color: "var(--accent)" }}>Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  // If seller but not onboarded, show continue onboarding
  if (!isOnboarded) {
    return (
      <>
        <SiteNav user={user} />
        <main className="dashboard">
          <div className="auth-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div className="auth-card__header">
              <h1 className="auth-card__title">Complete Setup</h1>
              <p className="auth-card__subtitle">
                You're almost there! Complete your Stripe account setup to start selling.
              </p>
              {sellerConnectState?.liveChecked && (
                <p style={{ marginTop: "0.8rem", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Requirements: {sellerConnectState.requirementsStatus || "unknown"} • Transfers: {sellerConnectState.transfersCapabilityStatus || "unknown"}
                </p>
              )}
            </div>

            <SellerDashboardClient action="onboard" buttonText="Continue Setup" />
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Get seller's apps with stats
  const apps = await query<SellerApp>(
    `SELECT 
      a.id, a.name, a.slug, a.icon_url, a.is_published, a.min_price_cents,
      COUNT(p.id) as purchase_count,
      COALESCE(SUM(p.amount_cents), 0) as total_revenue_cents
     FROM apps a
     LEFT JOIN purchases p ON p.app_id = a.id AND p.status = 'completed'
     WHERE a.owner_id = ?
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
    [user.id],
    env
  );

  // Get overall stats
  const stats = await queryOne<SellerStats>(
    `SELECT 
      COUNT(*) as total_sales,
      COALESCE(SUM(p.amount_cents), 0) as total_revenue_cents,
      COALESCE(SUM(p.platform_fee_cents), 0) as total_platform_fees_cents
     FROM purchases p
     JOIN apps a ON p.app_id = a.id
     WHERE a.owner_id = ? AND p.status = 'completed'`,
    [user.id],
    env
  );

  const netRevenue = (stats?.total_revenue_cents || 0) - (stats?.total_platform_fees_cents || 0);

  return (
    <>
      <SiteNav user={user} />
      <main className="dashboard">
        <header className="dashboard__header">
          <p className="dashboard__welcome">SELLER DASHBOARD</p>
          <h1 className="dashboard__title">
            {user.name || user.email.split("@")[0]}
            <span className="dot">.</span>
          </h1>

          <nav className="dashboard__nav">
            <a href="/seller" className="dashboard__nav-link dashboard__nav-link--active">
              OVERVIEW
            </a>
            <a href="/admin/apps" className="dashboard__nav-link">
              MY APPS
            </a>
            <SellerDashboardClient action="stripe-dashboard" />
          </nav>
        </header>

        {/* Stats */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <div className="purchased-card" style={{ padding: "1.5rem" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginBottom: "0.55rem", letterSpacing: "0.06em" }}>TOTAL SALES</p>
            <p style={{ fontSize: "2rem", fontWeight: 600 }}>{stats?.total_sales || 0}</p>
          </div>
          <div className="purchased-card" style={{ padding: "1.5rem" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginBottom: "0.55rem", letterSpacing: "0.06em" }}>GROSS REVENUE</p>
            <p style={{ fontSize: "2rem", fontWeight: 600 }}>
              ${((stats?.total_revenue_cents || 0) / 100).toFixed(2)}
            </p>
          </div>
          <div className="purchased-card" style={{ padding: "1.5rem" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginBottom: "0.55rem", letterSpacing: "0.06em" }}>NET EARNINGS</p>
            <p style={{ fontSize: "2rem", fontWeight: 600, color: "var(--accent)" }}>
              ${(netRevenue / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Apps */}
        <h2 className="dashboard__section-title">
          YOUR APPS ({apps.length})
        </h2>

        {apps.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No apps yet</h2>
            <p className="empty-state__text">
              Create your first app to start selling on ISOLATED.TECH.
            </p>
            <Link href="/admin/apps/new" className="auth-btn" style={{ display: "inline-block" }}>
              CREATE APP
            </Link>
          </div>
        ) : (
          <div className="purchased-grid">
            {apps.map((app) => (
              <div key={app.id} className="purchased-card">
                <Link href={`/admin/apps/${app.id}`} className="purchased-card__header purchased-card__header--clickable">
                  <div className="purchased-card__icon">
                    {app.icon_url ? (
                      <img src={app.icon_url} alt={`${app.name} icon`} />
                    ) : (
                      app.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="purchased-card__info">
                    <h3 className="purchased-card__name">{app.name}</h3>
                    <p className="purchased-card__meta">
                      {app.is_published ? "Published" : "Draft"} •{" "}
                      ${(app.min_price_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </Link>
                <div className="purchased-card__actions">
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    padding: "0.75rem 0",
                    borderTop: "1px solid var(--border)",
                    fontSize: "0.8rem"
                  }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>Sales: {app.purchase_count}</span>
                    <span style={{ fontWeight: 600 }}>
                      ${(app.total_revenue_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  <Link
                    href={`/admin/apps/${app.id}`}
                    className="purchased-card__btn purchased-card__btn--secondary"
                    style={{ marginTop: "0.5rem" }}
                  >
                    MANAGE
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link href="/admin/apps/new" className="auth-btn" style={{ display: "inline-block" }}>
            + CREATE NEW APP
          </Link>
        </div>

        <SellerCliOnboardingSection />
      </main>
      <SiteFooter />
    </>
  );
}
