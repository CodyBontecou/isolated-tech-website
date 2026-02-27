import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Purchase Details — Admin — ISOLATED.TECH",
};

interface Purchase {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  app_id: string;
  app_name: string;
  app_slug: string;
  amount_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

async function getPurchase(id: string): Promise<Purchase | null> {
  const env = getEnv();

  const purchase = await queryOne<Purchase>(
    `SELECT 
       p.id,
       p.user_id,
       u.email as user_email,
       u.name as user_name,
       p.app_id,
       a.name as app_name,
       a.slug as app_slug,
       p.amount_cents,
       p.status,
       p.stripe_payment_intent_id,
       p.created_at
     FROM purchases p
     JOIN user u ON p.user_id = u.id
     JOIN apps a ON p.app_id = a.id
     WHERE p.id = ?`,
    [id],
    env
  );

  return purchase;
}

function formatMoney(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchase = await getPurchase(id);

  if (!purchase) {
    notFound();
  }

  const stripeUrl = purchase.stripe_payment_intent_id
    ? `https://dashboard.stripe.com/payments/${purchase.stripe_payment_intent_id}`
    : null;

  return (
    <>
      <header className="admin-header">
        <Link
          href="/admin/purchases"
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginBottom: "0.5rem",
            display: "inline-block",
          }}
        >
          ← Back to Purchases
        </Link>
        <h1 className="admin-header__title">Purchase Details</h1>
        <p className="admin-header__subtitle">
          {purchase.app_name} • {formatMoney(purchase.amount_cents)}
        </p>
      </header>

      <div style={{ display: "grid", gap: "1.5rem", maxWidth: "600px" }}>
        {/* Status */}
        <div className="admin-section">
          <h2 className="admin-section__title">STATUS</h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span
              style={{
                color: purchase.status === "refunded" ? "#f87171" : "#4ade80",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {purchase.status.toUpperCase()}
            </span>
            {purchase.status === "completed" && purchase.amount_cents > 0 && (
              <button className="admin-table__btn admin-table__btn--danger">
                REFUND
              </button>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="admin-section">
          <h2 className="admin-section__title">CUSTOMER</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                NAME
              </span>
              <p style={{ margin: 0 }}>{purchase.user_name || "Anonymous"}</p>
            </div>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                EMAIL
              </span>
              <p style={{ margin: 0 }}>
                <a
                  href={`mailto:${purchase.user_email}`}
                  style={{ color: "var(--white)" }}
                >
                  {purchase.user_email}
                </a>
              </p>
            </div>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                USER ID
              </span>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                }}
              >
                {purchase.user_id}
              </p>
            </div>
          </div>
        </div>

        {/* App */}
        <div className="admin-section">
          <h2 className="admin-section__title">APP</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                NAME
              </span>
              <p style={{ margin: 0 }}>
                <Link
                  href={`/admin/apps/${purchase.app_id}`}
                  style={{ color: "var(--white)" }}
                >
                  {purchase.app_name}
                </Link>
              </p>
            </div>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                STORE PAGE
              </span>
              <p style={{ margin: 0 }}>
                <Link
                  href={`/apps/${purchase.app_slug}`}
                  style={{ color: "var(--gray)", fontSize: "0.85rem" }}
                >
                  /apps/{purchase.app_slug}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="admin-section">
          <h2 className="admin-section__title">PAYMENT</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                AMOUNT
              </span>
              <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {formatMoney(purchase.amount_cents)}
              </p>
            </div>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                DATE
              </span>
              <p style={{ margin: 0 }}>{formatDate(purchase.created_at)}</p>
            </div>
            {stripeUrl && (
              <div>
                <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                  STRIPE
                </span>
                <p style={{ margin: 0 }}>
                  <a
                    href={stripeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--white)", fontSize: "0.85rem" }}
                  >
                    View in Stripe Dashboard →
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* IDs */}
        <div className="admin-section">
          <h2 className="admin-section__title">IDENTIFIERS</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                PURCHASE ID
              </span>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                }}
              >
                {purchase.id}
              </p>
            </div>
            {purchase.stripe_payment_intent_id && (
              <div>
                <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                  STRIPE PAYMENT INTENT
                </span>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                  }}
                >
                  {purchase.stripe_payment_intent_id}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
