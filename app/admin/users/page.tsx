import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users — Admin — ISOLATED.TECH",
};

interface User {
  id: string;
  email: string;
  name: string | null;
  is_admin: number;
  newsletter_subscribed: number;
  created_at: string;
  purchase_count: number;
  review_count: number;
  oauth_providers: string[];
}

// Mock data
const MOCK_USERS: User[] = [
  {
    id: "user_admin_001",
    email: "cody@isolated.tech",
    name: "Cody Bontecou",
    is_admin: 1,
    newsletter_subscribed: 1,
    created_at: "2026-01-01T00:00:00Z",
    purchase_count: 0,
    review_count: 0,
    oauth_providers: ["github", "google"],
  },
  {
    id: "u1",
    email: "john@example.com",
    name: "John Doe",
    is_admin: 0,
    newsletter_subscribed: 1,
    created_at: "2026-02-10T10:00:00Z",
    purchase_count: 3,
    review_count: 2,
    oauth_providers: ["github"],
  },
  {
    id: "u2",
    email: "jane@example.com",
    name: "Jane Smith",
    is_admin: 0,
    newsletter_subscribed: 1,
    created_at: "2026-02-12T14:30:00Z",
    purchase_count: 2,
    review_count: 1,
    oauth_providers: ["google"],
  },
  {
    id: "u3",
    email: "dev@company.io",
    name: null,
    is_admin: 0,
    newsletter_subscribed: 0,
    created_at: "2026-02-15T09:00:00Z",
    purchase_count: 1,
    review_count: 0,
    oauth_providers: [],
  },
  {
    id: "u4",
    email: "mike@test.com",
    name: "Mike Johnson",
    is_admin: 0,
    newsletter_subscribed: 1,
    created_at: "2026-02-18T16:45:00Z",
    purchase_count: 1,
    review_count: 1,
    oauth_providers: ["apple"],
  },
  {
    id: "u5",
    email: "anonymous@mail.com",
    name: null,
    is_admin: 0,
    newsletter_subscribed: 0,
    created_at: "2026-02-20T11:15:00Z",
    purchase_count: 1,
    review_count: 0,
    oauth_providers: [],
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OAuthBadges({ providers }: { providers: string[] }) {
  if (providers.length === 0) {
    return (
      <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
        Magic Link
      </span>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      {providers.map((provider) => (
        <span
          key={provider}
          style={{
            background: "#333",
            padding: "0.15rem 0.4rem",
            fontSize: "0.6rem",
            fontWeight: 700,
            textTransform: "capitalize",
          }}
        >
          {provider}
        </span>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const users = MOCK_USERS;

  const newsletterCount = users.filter((u) => u.newsletter_subscribed).length;

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Users</h1>
        <p className="admin-header__subtitle">
          {users.length} users • {newsletterCount} newsletter subscribers
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
          placeholder="Search by email or name..."
          className="settings-input"
          style={{ width: "250px", flex: "none" }}
        />
        <select className="settings-input" style={{ width: "180px" }}>
          <option value="">All Users</option>
          <option value="newsletter">Newsletter Only</option>
          <option value="purchasers">Has Purchases</option>
          <option value="admins">Admins</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>AUTH</th>
              <th>PURCHASES</th>
              <th>REVIEWS</th>
              <th>NEWSLETTER</th>
              <th>JOINED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="admin-table__user">
                    <span className="admin-table__user-name">
                      {user.name || "—"}
                      {user.is_admin === 1 && (
                        <span
                          style={{
                            color: "#fbbf24",
                            marginLeft: "0.5rem",
                            fontSize: "0.6rem",
                          }}
                        >
                          ADMIN
                        </span>
                      )}
                    </span>
                    <span className="admin-table__user-email">{user.email}</span>
                  </div>
                </td>
                <td>
                  <OAuthBadges providers={user.oauth_providers} />
                </td>
                <td>{user.purchase_count}</td>
                <td>{user.review_count}</td>
                <td>
                  {user.newsletter_subscribed ? (
                    <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>
                      ✓
                    </span>
                  ) : (
                    <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                      —
                    </span>
                  )}
                </td>
                <td className="admin-table__date">
                  {formatDate(user.created_at)}
                </td>
                <td>
                  <div className="admin-table__actions">
                    <button className="admin-table__btn">VIEW</button>
                    {user.is_admin === 0 && (
                      <button className="admin-table__btn admin-table__btn--danger">
                        DELETE
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export */}
      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          gap: "0.75rem",
        }}
      >
        <button className="auth-btn auth-btn--outline" style={{ width: "auto" }}>
          EXPORT NEWSLETTER LIST (CSV)
        </button>
        <button className="auth-btn auth-btn--outline" style={{ width: "auto" }}>
          EXPORT ALL USERS (CSV)
        </button>
      </div>
    </>
  );
}
