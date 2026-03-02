import type { Metadata } from "next";
import Link from "next/link";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ConnectDemoClient } from "./connect-demo-client";

export const metadata: Metadata = {
  title: "Stripe Connect Demo — ISOLATED.TECH",
  description:
    "Sample Stripe Connect v2 integration: onboarding, product creation, storefront, and destination charges.",
};

export default async function ConnectDemoPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <SiteNav user={user} />

      <main className="dashboard" style={{ maxWidth: 900 }}>
        <header style={{ marginBottom: "1.25rem" }}>
          <p className="dashboard__welcome">STRIPE CONNECT SAMPLE</p>
          <h1 className="dashboard__title" style={{ marginBottom: "0.75rem" }}>
            Connect v2 onboarding + storefront
            <span className="dot">.</span>
          </h1>
          <p style={{ color: "var(--gray)", maxWidth: 720 }}>
            This page demonstrates a complete sample flow using a single Stripe Client for requests:
            create/reuse connected accounts, onboard sellers, create platform products, and run hosted
            checkout destination charges with application fees.
          </p>
        </header>

        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1rem",
            marginBottom: "1.25rem",
            background: "var(--card-bg)",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "0.95rem" }}>Required env placeholders</h2>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.8, color: "var(--gray)" }}>
            <li>
              <code>STRIPE_SECRET_KEY</code> = <code>sk_test_...</code> (or <code>sk_live_...</code>)
            </li>
            <li>
              <code>STRIPE_CONNECT_DEMO_WEBHOOK_SECRET</code> = <code>whsec_...</code> for thin events
            </li>
          </ul>
          <p style={{ color: "var(--gray)", marginBottom: 0, marginTop: "0.75rem" }}>
            Webhook test command:
          </p>
          <pre
            style={{
              marginTop: "0.5rem",
              marginBottom: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "0.8rem",
              background: "var(--black)",
              borderRadius: 8,
              padding: "0.75rem",
            }}
          >
            stripe listen --thin-events
            {' '}
            'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated'
            {' '}
            --forward-thin-to http://localhost:3000/api/webhooks/stripe-connect-demo
          </pre>
        </section>

        <ConnectDemoClient
          isSignedIn={Boolean(user)}
          currentUserLabel={user ? user.name || user.email : null}
        />

        {!user && (
          <p style={{ marginTop: "1rem", color: "var(--gray)" }}>
            Want to test seller onboarding/product creation? <Link href="/auth/login">Sign in first</Link>.
          </p>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
