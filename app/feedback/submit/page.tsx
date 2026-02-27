import { Metadata } from "next";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { SubmitForm } from "./submit-form";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Submit Feedback — ISOLATED.TECH",
  description: "Submit a feature request, bug report, or improvement suggestion.",
};

async function getApps(): Promise<{ id: string; name: string; slug: string; icon_url: string | null }[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query(
    `SELECT id, name, slug, icon_url FROM apps WHERE is_published = 1 ORDER BY name`,
    [],
    env
  );
}

export default async function SubmitFeedbackPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    redirect("/auth/login?redirect=/feedback/submit");
  }

  const apps = await getApps();

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
          {user.isAdmin && <a href="/admin">ADMIN</a>}
          <a href="/dashboard">DASHBOARD</a>
          <SignOutButton />
        </div>
      </nav>

      {/* MAIN */}
      <main className="submit-page">
        <div className="submit-card">
          <Link href="/feedback" className="submit-back">
            ← Back to Feedback
          </Link>

          <header className="submit-header">
            <h1 className="submit-title">Submit Feedback</h1>
            <p className="submit-subtitle">
              Share your ideas, report bugs, or suggest improvements. 
              The community votes on what matters most.
            </p>
          </header>

          <SubmitForm apps={apps} />
        </div>
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </>
  );
}
