import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Discount Codes — Admin — ISOLATED.TECH",
};

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  app_id: string | null;
  app_name: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

// Mock data
const MOCK_CODES: DiscountCode[] = [
  {
    id: "code_1",
    code: "LAUNCH50",
    discount_type: "percent",
    discount_value: 50,
    app_id: null,
    app_name: null,
    max_uses: 100,
    times_used: 23,
    expires_at: "2026-03-31T23:59:59Z",
    is_active: 1,
    created_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "code_2",
    code: "VOXFREE",
    discount_type: "percent",
    discount_value: 100,
    app_id: "app_voxboard_001",
    app_name: "Voxboard",
    max_uses: 10,
    times_used: 10,
    expires_at: null,
    is_active: 0,
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "code_3",
    code: "SAVE2",
    discount_type: "fixed",
    discount_value: 200,
    app_id: null,
    app_name: null,
    max_uses: null,
    times_used: 45,
    expires_at: null,
    is_active: 1,
    created_at: "2026-02-10T00:00:00Z",
  },
];

function formatDiscount(type: string, value: number): string {
  if (type === "percent") return `${value}%`;
  return `$${(value / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CodeStatus({ code }: { code: DiscountCode }) {
  if (!code.is_active) {
    return (
      <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>INACTIVE</span>
    );
  }

  if (code.max_uses && code.times_used >= code.max_uses) {
    return (
      <span style={{ color: "#f87171", fontSize: "0.7rem" }}>MAXED OUT</span>
    );
  }

  if (code.expires_at && new Date(code.expires_at) < new Date()) {
    return (
      <span style={{ color: "#f87171", fontSize: "0.7rem" }}>EXPIRED</span>
    );
  }

  return (
    <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>ACTIVE</span>
  );
}

export default function AdminCodesPage() {
  const codes = MOCK_CODES;

  return (
    <>
      <header className="admin-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="admin-header__title">Discount Codes</h1>
            <p className="admin-header__subtitle">
              Manage promotional codes and discounts
            </p>
          </div>
          <Link href="/admin/codes/new" className="auth-btn" style={{ width: "auto" }}>
            + NEW CODE
          </Link>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>CODE</th>
              <th>DISCOUNT</th>
              <th>APP</th>
              <th>USAGE</th>
              <th>EXPIRES</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code.id}>
                <td>
                  <code
                    style={{
                      background: "var(--black)",
                      padding: "0.25rem 0.5rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    {code.code}
                  </code>
                </td>
                <td className="admin-table__money">
                  {formatDiscount(code.discount_type, code.discount_value)}
                </td>
                <td>
                  {code.app_name || (
                    <span style={{ color: "var(--gray)" }}>All apps</span>
                  )}
                </td>
                <td>
                  {code.times_used}
                  {code.max_uses && (
                    <span style={{ color: "var(--gray)" }}>
                      {" "}/ {code.max_uses}
                    </span>
                  )}
                </td>
                <td className="admin-table__date">{formatDate(code.expires_at)}</td>
                <td>
                  <CodeStatus code={code} />
                </td>
                <td>
                  <div className="admin-table__actions">
                    <Link
                      href={`/admin/codes/${code.id}/edit`}
                      className="admin-table__btn"
                    >
                      EDIT
                    </Link>
                    <button className="admin-table__btn admin-table__btn--danger">
                      DELETE
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {codes.length === 0 && (
        <div className="empty-state">
          <h2 className="empty-state__title">No discount codes yet</h2>
          <p className="empty-state__text">
            Create your first discount code to offer promotions.
          </p>
          <Link href="/admin/codes/new" className="auth-btn" style={{ display: "inline-block" }}>
            CREATE CODE
          </Link>
        </div>
      )}
    </>
  );
}
