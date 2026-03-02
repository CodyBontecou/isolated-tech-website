import Link from "next/link";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default async function ConnectDemoSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <SiteNav user={user} />

      <main className="dashboard" style={{ maxWidth: 700 }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1rem",
            background: "var(--card-bg)",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Payment successful</h1>
          <p style={{ color: "var(--gray)" }}>
            Hosted Checkout completed. You can now inspect the PaymentIntent, transfer, and application fee in Stripe.
          </p>
          {searchParams.session_id ? (
            <p style={{ fontSize: "0.9rem" }}>
              Session ID: <code>{searchParams.session_id}</code>
            </p>
          ) : null}

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
            <Link href="/connect-demo" className="auth-btn" style={{ display: "inline-block" }}>
              Back to Connect demo
            </Link>
            <a
              href="https://dashboard.stripe.com/test/payments"
              target="_blank"
              rel="noreferrer"
              className="auth-btn"
              style={{ display: "inline-block", background: "transparent", color: "var(--text)" }}
            >
              Open Stripe payments ↗
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
