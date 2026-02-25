import { Metadata } from "next";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Admin Dashboard — ISOLATED.TECH",
};

interface Stats {
  revenueMonth: number;
  revenueTotal: number;
  totalUsers: number;
  totalPurchases: number;
  newUsersToday: number;
  purchasesToday: number;
}

interface RecentPurchase {
  id: string;
  user_name: string | null;
  user_email: string;
  app_name: string;
  amount_cents: number;
  created_at: string;
}

async function getStats(): Promise<Stats> {
  const env = getEnv();

  // Revenue this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartStr = monthStart.toISOString();

  const revenueMonthResult = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount_cents), 0) as total 
     FROM purchases 
     WHERE status = 'completed' 
     AND created_at >= ?`,
    [monthStartStr],
    env
  );

  // Revenue all time
  const revenueTotalResult = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount_cents), 0) as total 
     FROM purchases 
     WHERE status = 'completed'`,
    [],
    env
  );

  // Total users
  const usersResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM users`,
    [],
    env
  );

  // Total purchases
  const purchasesResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM purchases WHERE status = 'completed'`,
    [],
    env
  );

  // New users today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartStr = todayStart.toISOString();

  const newUsersTodayResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM users WHERE created_at >= ?`,
    [todayStartStr],
    env
  );

  // Purchases today
  const purchasesTodayResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM purchases 
     WHERE status = 'completed' 
     AND created_at >= ?`,
    [todayStartStr],
    env
  );

  return {
    revenueMonth: revenueMonthResult?.total ?? 0,
    revenueTotal: revenueTotalResult?.total ?? 0,
    totalUsers: usersResult?.count ?? 0,
    totalPurchases: purchasesResult?.count ?? 0,
    newUsersToday: newUsersTodayResult?.count ?? 0,
    purchasesToday: purchasesTodayResult?.count ?? 0,
  };
}

async function getRecentPurchases(): Promise<RecentPurchase[]> {
  const env = getEnv();

  const purchases = await query<{
    id: string;
    user_name: string | null;
    user_email: string;
    app_name: string;
    amount_cents: number;
    created_at: string;
  }>(
    `SELECT 
       p.id,
       u.name as user_name,
       u.email as user_email,
       a.name as app_name,
       p.amount_cents,
       p.created_at
     FROM purchases p
     JOIN users u ON p.user_id = u.id
     JOIN apps a ON p.app_id = a.id
     WHERE p.status = 'completed'
     ORDER BY p.created_at DESC
     LIMIT 5`,
    [],
    env
  );

  return purchases;
}

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

export default async function AdminDashboardPage() {
  const [stats, recentPurchases] = await Promise.all([
    getStats(),
    getRecentPurchases(),
  ]);

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
            {formatMoney(stats.revenueMonth)}
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__label">REVENUE (ALL TIME)</div>
          <div className="admin-stat__value admin-stat__value--money">
            {formatMoney(stats.revenueTotal)}
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__label">TOTAL USERS</div>
          <div className="admin-stat__value">{stats.totalUsers}</div>
          <div className="admin-stat__change">+{stats.newUsersToday} today</div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat__label">TOTAL PURCHASES</div>
          <div className="admin-stat__value">{stats.totalPurchases}</div>
          <div className="admin-stat__change">
            +{stats.purchasesToday} today
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

        {recentPurchases.length > 0 ? (
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
                {recentPurchases.map((purchase) => (
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
        ) : (
          <p style={{ color: "var(--gray)", fontSize: "0.8rem" }}>
            No purchases yet.
          </p>
        )}
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
