import { Metadata } from "next";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subscribers — Admin — ISOLATED.TECH",
};

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string;
  is_active: number;
  user_id: string | null;
  created_at: string;
}

interface LegacyPurchase {
  id: string;
  email: string;
  product_name: string;
  user_id: string | null;
  claimed_at: string | null;
  source: string;
  created_at: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  const env = getEnv();
  try {
    return await query<Subscriber>(
      `SELECT id, email, name, source, is_active, user_id, created_at
       FROM subscribers
       ORDER BY created_at DESC`,
      [],
      env
    );
  } catch {
    return [];
  }
}

async function getLegacyPurchases(): Promise<LegacyPurchase[]> {
  const env = getEnv();
  try {
    return await query<LegacyPurchase>(
      `SELECT id, email, product_name, user_id, claimed_at, source, created_at
       FROM legacy_purchases
       ORDER BY created_at DESC`,
      [],
      env
    );
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminSubscribersPage() {
  const [subscribers, legacyPurchases] = await Promise.all([
    getSubscribers(),
    getLegacyPurchases(),
  ]);

  const activeCount = subscribers.filter((s) => s.is_active).length;
  const claimedCount = legacyPurchases.filter((p) => p.user_id).length;
  const gumroadCount = subscribers.filter((s) => s.source === "gumroad").length;

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Email Subscribers</h1>
        <p className="admin-header__subtitle">
          {activeCount} active • {gumroadCount} from Gumroad • {legacyPurchases.length} legacy purchases ({claimedCount} claimed)
        </p>
      </header>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/admin/subscribers/import"
          className="auth-btn"
          style={{ width: "auto", padding: "0.5rem 1rem" }}
        >
          + IMPORT EMAILS
        </Link>
        <Link
          href="/admin/broadcasts/new"
          className="auth-btn auth-btn--outline"
          style={{ width: "auto", padding: "0.5rem 1rem" }}
        >
          📧 NEW BROADCAST
        </Link>
        <Link
          href="/admin/broadcasts"
          className="auth-btn auth-btn--outline"
          style={{ width: "auto", padding: "0.5rem 1rem" }}
        >
          VIEW BROADCASTS
        </Link>
      </div>

      {/* Subscribers Table */}
      <h2 style={{ fontSize: "0.75rem", letterSpacing: "1px", color: "#666", marginBottom: "1rem" }}>
        SUBSCRIBERS ({subscribers.length})
      </h2>

      {subscribers.length > 0 ? (
        <div className="admin-table-wrap" style={{ marginBottom: "2rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>EMAIL</th>
                <th>NAME</th>
                <th>SOURCE</th>
                <th>STATUS</th>
                <th>LINKED USER</th>
                <th>ADDED</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{sub.email}</td>
                  <td>{sub.name || "—"}</td>
                  <td>
                    <span
                      style={{
                        background: sub.source === "gumroad" ? "#7c3aed" : "#333",
                        padding: "0.15rem 0.4rem",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {sub.source}
                    </span>
                  </td>
                  <td>
                    {sub.is_active ? (
                      <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>ACTIVE</span>
                    ) : (
                      <span style={{ color: "#ef4444", fontSize: "0.7rem" }}>UNSUBSCRIBED</span>
                    )}
                  </td>
                  <td>
                    {sub.user_id ? (
                      <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>✓ LINKED</span>
                    ) : (
                      <span style={{ color: "#666", fontSize: "0.7rem" }}>—</span>
                    )}
                  </td>
                  <td className="admin-table__date">{formatDate(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" style={{ marginBottom: "2rem" }}>
          <h2 className="empty-state__title">No subscribers yet</h2>
          <p className="empty-state__text">Import emails from Gumroad or add them manually.</p>
        </div>
      )}

      {/* Legacy Purchases Table */}
      <h2 style={{ fontSize: "0.75rem", letterSpacing: "1px", color: "#666", marginBottom: "1rem" }}>
        LEGACY PURCHASES ({legacyPurchases.length})
      </h2>

      {legacyPurchases.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>EMAIL</th>
                <th>PRODUCT</th>
                <th>SOURCE</th>
                <th>CLAIMED</th>
                <th>IMPORTED</th>
              </tr>
            </thead>
            <tbody>
              {legacyPurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{purchase.email}</td>
                  <td>{purchase.product_name}</td>
                  <td>
                    <span
                      style={{
                        background: purchase.source === "gumroad" ? "#7c3aed" : "#333",
                        padding: "0.15rem 0.4rem",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {purchase.source}
                    </span>
                  </td>
                  <td>
                    {purchase.user_id ? (
                      <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>
                        ✓ {purchase.claimed_at ? formatDate(purchase.claimed_at) : "CLAIMED"}
                      </span>
                    ) : (
                      <span style={{ color: "#f59e0b", fontSize: "0.7rem" }}>PENDING</span>
                    )}
                  </td>
                  <td className="admin-table__date">{formatDate(purchase.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No legacy purchases</h2>
          <p className="empty-state__text">Import Gumroad sales to track them here.</p>
        </div>
      )}

      {/* Export */}
      {subscribers.length > 0 && (
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            gap: "0.75rem",
          }}
        >
          <button className="auth-btn auth-btn--outline" style={{ width: "auto" }}>
            EXPORT SUBSCRIBERS (CSV)
          </button>
        </div>
      )}
    </>
  );
}
