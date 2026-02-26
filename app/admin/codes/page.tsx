import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Discount Codes — Admin — ISOLATED.TECH",
};

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  app_id: string | null;
  app_name: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

async function getDiscountCodes(): Promise<DiscountCode[]> {
  const env = getEnv();

  const codes = await query<DiscountCode>(
    `SELECT 
       dc.id,
       dc.code,
       dc.discount_type,
       dc.discount_value,
       dc.app_id,
       a.name as app_name,
       dc.max_uses,
       dc.times_used,
       dc.expires_at,
       dc.is_active,
       dc.created_at
     FROM discount_codes dc
     LEFT JOIN apps a ON dc.app_id = a.id
     ORDER BY dc.created_at DESC`,
    [],
    env
  );

  return codes;
}

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

export default async function AdminCodesPage() {
  const codes = await getDiscountCodes();

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
          <a href="/admin/codes/new" className="auth-btn" style={{ width: "auto" }}>
            + NEW CODE
          </a>
        </div>
      </header>

      {codes.length > 0 ? (
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
                      <a
                        href={`/admin/codes/${code.id}/edit`}
                        className="admin-table__btn"
                      >
                        EDIT
                      </a>
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
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No discount codes yet</h2>
          <p className="empty-state__text">
            Create your first discount code to offer promotions.
          </p>
          <a href="/admin/codes/new" className="auth-btn" style={{ display: "inline-block" }}>
            CREATE CODE
          </a>
        </div>
      )}
    </>
  );
}
