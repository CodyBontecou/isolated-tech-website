import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queryOne, execute } from "@/lib/db";
import { createStripeClient, checkAccountStatus } from "@/lib/stripe";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Setup Complete — ISOLATED.TECH",
  description: "Your seller account is ready",
};

export default async function OnboardCompletePage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    redirect("/auth/login?redirect=/seller");
  }

  // Get seller info
  const sellerInfo = await queryOne<{
    stripe_account_id: string | null;
    stripe_onboarded: number;
  }>(
    `SELECT stripe_account_id, stripe_onboarded FROM user WHERE id = ?`,
    [user.id],
    env
  );

  if (!sellerInfo?.stripe_account_id) {
    redirect("/seller");
  }

  // Check Stripe account status
  const stripe = createStripeClient(env);
  let isComplete = false;
  
  if (stripe) {
    try {
      const status = await checkAccountStatus(stripe, sellerInfo.stripe_account_id);
      isComplete = status.chargesEnabled;

      // Update database if onboarding is complete
      if (isComplete && !sellerInfo.stripe_onboarded) {
        await execute(
          `UPDATE user SET stripe_onboarded = 1 WHERE id = ?`,
          [user.id],
          env
        );
      }
    } catch (e) {
      console.error("Failed to check Stripe status:", e);
    }
  }

  if (!isComplete) {
    return (
      <>
        <SiteNav user={user} />
        <main className="dashboard">
          <div className="auth-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div className="auth-card__header">
              <h1 className="auth-card__title">Setup Incomplete</h1>
              <p className="auth-card__subtitle">
                It looks like your Stripe account setup isn't complete yet.
                Please finish setting up your account to start selling.
              </p>
            </div>

            <Link href="/seller" className="auth-btn" style={{ display: "block", textAlign: "center" }}>
              CONTINUE SETUP
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteNav user={user} />
      <main className="dashboard">
        <div className="auth-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="auth-card__header">
            <div style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "50%", 
              background: "var(--accent)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "2rem"
            }}>
              ✓
            </div>
            <h1 className="auth-card__title">You're All Set!</h1>
            <p className="auth-card__subtitle">
              Your seller account is now active. You can start creating and selling apps on ISOLATED.TECH.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Link 
              href="/admin/apps/new" 
              className="auth-btn" 
              style={{ display: "block", textAlign: "center" }}
            >
              CREATE YOUR FIRST APP
            </Link>
            <Link 
              href="/seller" 
              className="auth-btn" 
              style={{ 
                display: "block", 
                textAlign: "center",
                background: "transparent",
                border: "1px solid var(--border)"
              }}
            >
              GO TO DASHBOARD
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
