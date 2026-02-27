import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Purchases — Admin — ISOLATED.TECH",
};

interface Purchase {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  app_id: string;
  app_name: string;
  amount_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

async function getPurchases(): Promise<Purchase[]> {
  const env = getEnv();

  const purchases = await query<Purchase>(
    `SELECT 
       p.id,
       p.user_id,
       u.email as user_email,
       u.name as user_name,
       p.app_id,
       a.name as app_name,
       p.amount_cents,
       p.status,
       p.stripe_payment_intent_id,
       p.created_at
     FROM purchases p
     JOIN user u ON p.user_id = u.id
     JOIN apps a ON p.app_id = a.id
     ORDER BY p.created_at DESC`,
    [],
    env
  );

  return purchases;
}

function formatMoney(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "refunded") {
    return (
      <span
        style={{
          color: "#f87171",
          fontSize: "0.7rem",
          fontWeight: 700,
        }}
      >
        REFUNDED
      </span>
    );
  }
  return (
    <span
      style={{
        color: "#4ade80",
        fontSize: "0.7rem",
        fontWeight: 700,
      }}
    >
      COMPLETED
    </span>
  );
}

export default async function AdminPurchasesPage() {
  const purchases = await getPurchases();

  const totalRevenue = purchases
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Purchases</h1>
        <p className="admin-header__subtitle">
          {purchases.length} purchases • {formatMoney(totalRevenue)} total
          revenue
        </p>
      </header>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search by email..."
          className="settings-input"
          style={{ width: "250px", flex: "none" }}
        />
        <select className="settings-input" style={{ width: "150px" }}>
          <option value="">All Apps</option>
        </select>
        <select className="settings-input" style={{ width: "150px" }}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {purchases.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>APP</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>
                      <div className="admin-table__user">
                        <span className="admin-table__user-name">
                          {purchase.user_name || "Anonymous"}
                        </span>
                        <span className="admin-table__user-email">
                          {purchase.user_email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/admin/apps/${purchase.app_id}`}
                        style={{ color: "var(--white)" }}
                      >
                        {purchase.app_name}
                      </Link>
                    </td>
                    <td className="admin-table__money">
                      {formatMoney(purchase.amount_cents)}
                    </td>
                    <td>
                      <StatusBadge status={purchase.status} />
                    </td>
                    <td className="admin-table__date">
                      {formatDate(purchase.created_at)}
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="admin-table__btn"
                        >
                          VIEW
                        </Link>
                        {purchase.status === "completed" &&
                          purchase.amount_cents > 0 && (
                            <button className="admin-table__btn admin-table__btn--danger">
                              REFUND
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "var(--gray)",
            }}
          >
            <span>Showing 1-{purchases.length} of {purchases.length}</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="admin-table__btn" disabled>
                ← PREV
              </button>
              <button className="admin-table__btn" disabled>
                NEXT →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No purchases yet</h2>
          <p className="empty-state__text">
            Purchases will appear here once customers start buying apps.
          </p>
        </div>
      )}
    </>
  );
}
