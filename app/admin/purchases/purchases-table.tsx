"use client";

import Link from "next/link";
import { RefundButton } from "@/components/refund-modal";

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
  if (status === "refunded_with_access") {
    return (
      <span
        style={{
          color: "#fbbf24",
          fontSize: "0.7rem",
          fontWeight: 700,
        }}
      >
        REFUNDED (KEPT ACCESS)
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

export function PurchasesTable({ purchases }: { purchases: Purchase[] }) {
  return (
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
                      <RefundButton
                        purchaseId={purchase.id}
                        customerEmail={purchase.user_email}
                        appName={purchase.app_name}
                        amount={formatMoney(purchase.amount_cents)}
                      />
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
