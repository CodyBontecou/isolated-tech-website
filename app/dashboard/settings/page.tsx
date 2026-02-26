import { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Settings — ISOLATED.TECH",
  description: "Manage your account settings.",
};

// Mock user for now
interface User {
  id: string;
  name: string | null;
  email: string;
  newsletterSubscribed: boolean;
  providers: string[];
  isAdmin?: boolean;
}

const MOCK_USER: User | null = {
  id: "user_001",
  name: "Cody",
  email: "cody@isolated.tech",
  newsletterSubscribed: true,
  providers: ["github"],
};

export default function SettingsPage() {
  // TODO: Replace with actual auth check
  const user = MOCK_USER;

  if (!user) {
    return (
      <>
        <nav className="nav">
          <a href="/" className="nav__logo">
            ISOLATED<span className="dot">.</span>TECH
          </a>
          <div className="nav__links">
            <a href="/apps">APPS</a>
            <a href="/auth/login">SIGN IN</a>
          </div>
        </nav>

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
      <nav className="nav">
        {/* Use <a> tag to force full page navigation - vinext RSC fetch doesn't include credentials */}
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/apps">APPS</a>
          {user.isAdmin && <a href="/admin">ADMIN</a>}
          <SignOutButton />
        </div>
      </nav>

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

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
