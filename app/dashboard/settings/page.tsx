import { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Settings — ISOLATED.TECH",
  description: "Manage your account settings.",
};

interface SettingsUser {
  id: string;
  name: string | null;
  email: string;
  newsletterSubscribed: boolean;
  providers: string[];
  isAdmin?: boolean;
}

export default async function SettingsPage() {
  const env = getEnv();
  const authUser = env ? await getCurrentUser(env) : null;

  // Fetch user's linked providers from database
  let providers: string[] = [];
  if (env?.DB && authUser) {
    try {
      const result = await env.DB.prepare(`
        SELECT provider_id FROM accounts WHERE user_id = ?
      `).bind(authUser.id).all<{ provider_id: string }>();
      providers = result.results.map(r => r.provider_id);
    } catch (err) {
      console.error("Failed to fetch providers:", err);
    }
  }

  const user: SettingsUser | null = authUser ? {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    newsletterSubscribed: authUser.newsletterSubscribed,
    providers,
    isAdmin: authUser.isAdmin,
  } : null;

  if (!user) {
    return (
      <>
        <SiteNav user={null} redirectPath="/dashboard/settings" />

        <main className="dashboard">
          <div className="auth-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div className="auth-card__header">
              <h1 className="auth-card__title">Sign In Required</h1>
              <p className="auth-card__subtitle">
                Please sign in to access your account settings.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="auth-btn"
              style={{ display: "block", textAlign: "center" }}
            >
              SIGN IN
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteNav user={user} />

      <main className="dashboard">
        <header className="dashboard__header">
          <p className="dashboard__welcome">ACCOUNT</p>
          <h1 className="dashboard__title">
            Settings<span className="dot">.</span>
          </h1>

          <nav className="dashboard__nav">
            <a href="/dashboard" className="dashboard__nav-link">
              MY APPS
            </a>
            <a href="/dashboard/reviews" className="dashboard__nav-link">
              REVIEWS
            </a>
            <a href="/dashboard/settings" className="dashboard__nav-link dashboard__nav-link--active">
              SETTINGS
            </a>
          </nav>
        </header>

        <SettingsForm user={user} />
      </main>

      <SiteFooter />
    </>
  );
}
