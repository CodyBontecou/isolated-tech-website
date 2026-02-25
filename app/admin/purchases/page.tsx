import { Metadata } from "next";
import Link from "next/link";

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
  status: "completed" | "refunded";
  stripe_payment_id: string | null;
  created_at: string;
}

// Mock data
const MOCK_PURCHASES: Purchase[] = [
  {
    id: "p1",
    user_id: "u1",
    user_email: "john@example.com",
    user_name: "John Doe",
    app_id: "app_voxboard_001",
    app_name: "Voxboard",
    amount_cents: 500,
    status: "completed",
    stripe_payment_id: "pi_abc123",
    created_at: "2026-02-25T09:30:00Z",
  },
  {
    id: "p2",
    user_id: "u2",
    user_email: "jane@example.com",
    user_name: "Jane Smith",
    app_id: "app_syncmd_001",
    app_name: "sync.md",
    amount_cents: 1000,
    status: "completed",
    stripe_payment_id: "pi_def456",
    created_at: "2026-02-25T08:15:00Z",
  },
  {
    id: "p3",
    user_id: "u3",
    user_email: "dev@company.io",
    user_name: null,
    app_id: "app_healthmd_001",
    app_name: "health.md",
    amount_cents: 500,
    status: "refunded",
    stripe_payment_id: "pi_ghi789",
    created_at: "2026-02-24T22:00:00Z",
  },
  {
    id: "p4",
    user_id: "u4",
    user_email: "mike@test.com",
    user_name: "Mike Johnson",
    app_id: "app_voxboard_001",
    app_name: "Voxboard",
    amount_cents: 800,
    status: "completed",
    stripe_payment_id: "pi_jkl012",
    created_at: "2026-02-24T18:30:00Z",
  },
  {
    id: "p5",
    user_id: "u5",
    user_email: "anonymous@mail.com",
    user_name: null,
    app_id: "app_imghost_001",
    app_name: "imghost",
    amount_cents: 0,
    status: "completed",
    stripe_payment_id: null,
    created_at: "2026-02-24T15:00:00Z",
  },
];

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

export default function AdminPurchasesPage() {
  const purchases = MOCK_PURCHASES;

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
          <option value="voxboard">Voxboard</option>
          <option value="syncmd">sync.md</option>
          <option value="healthmd">health.md</option>
          <option value="imghost">imghost</option>
        </select>
        <select className="settings-input" style={{ width: "150px" }}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

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
                    <button className="admin-table__btn">VIEW</button>
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
  );
}
