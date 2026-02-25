import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard — ISOLATED.TECH",
};

// Mock data - will be replaced with D1 queries
const STATS = {
  revenueMonth: 15000, // cents
  revenueTotal: 125000, // cents
  totalUsers: 156,
  totalPurchases: 89,
  newUsersToday: 5,
  purchasesToday: 3,
};

const RECENT_PURCHASES = [
  {
    id: "p1",
    user_name: "John Doe",
    user_email: "john@example.com",
    app_name: "Voxboard",
    amount_cents: 500,
    created_at: "2026-02-25T09:30:00Z",
  },
  {
    id: "p2",
    user_name: "Jane Smith",
    user_email: "jane@example.com",
    app_name: "sync.md",
    amount_cents: 1000,
    created_at: "2026-02-25T08:15:00Z",
  },
  {
    id: "p3",
    user_name: null,
    user_email: "dev@company.io",
    app_name: "health.md",
    amount_cents: 500,
    created_at: "2026-02-24T22:00:00Z",
  },
  {
    id: "p4",
    user_name: "Mike Johnson",
    user_email: "mike@test.com",
    app_name: "Voxboard",
    amount_cents: 800,
    created_at: "2026-02-24T18:30:00Z",
  },
  {
    id: "p5",
    user_name: null,
    user_email: "anonymous@mail.com",
    app_name: "imghost",
    amount_cents: 0,
    created_at: "2026-02-24T15:00:00Z",
  },
];

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AdminDashboardPage() {
  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Dashboard</h1>
        <p className="admin-header__subtitle">
          Overview of your app store performance
        </p>
      </header>

      {/* Stats Grid */}
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__label">REVENUE (THIS MONTH)</div>
          <div className="admin-stat__value admin-stat__value--money">
            {formatMoney(STATS.revenueMonth)}
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__label">REVENUE (ALL TIME)</div>
          <div className="admin-stat__value admin-stat__value--money">
            {formatMoney(STATS.revenueTotal)}
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__label">TOTAL USERS</div>
          <div className="admin-stat__value">{STATS.totalUsers}</div>
          <div className="admin-stat__change">+{STATS.newUsersToday} today</div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__label">TOTAL PURCHASES</div>
          <div className="admin-stat__value">{STATS.totalPurchases}</div>
          <div className="admin-stat__change">
            +{STATS.purchasesToday} today
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <section className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">RECENT PURCHASES</h2>
          <Link
            href="/admin/purchases"
            style={{ fontSize: "0.7rem", color: "var(--gray)" }}
          >
            View all →
          </Link>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>APP</th>
                <th>AMOUNT</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_PURCHASES.map((purchase) => (
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
                  <td>{purchase.app_name}</td>
                  <td className="admin-table__money">
                    {purchase.amount_cents === 0
                      ? "Free"
                      : formatMoney(purchase.amount_cents)}
                  </td>
                  <td className="admin-table__date">
                    {formatDate(purchase.created_at)}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-table__btn">VIEW</button>
                      {purchase.amount_cents > 0 && (
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
      </section>

      {/* Quick Actions */}
      <section className="admin-section">
        <h2 className="admin-section__title">QUICK ACTIONS</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/admin/apps/new"
            className="auth-btn"
            style={{ width: "auto" }}
          >
            + NEW APP
          </Link>
          <Link
            href="/admin/codes/new"
            className="auth-btn auth-btn--outline"
            style={{ width: "auto" }}
          >
            + NEW DISCOUNT CODE
          </Link>
          <Link
            href="/admin/broadcast"
            className="auth-btn auth-btn--outline"
            style={{ width: "auto" }}
          >
            ✉ SEND BROADCAST
          </Link>
        </div>
      </section>
    </>
  );
}
