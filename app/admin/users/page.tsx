import { Metadata } from "next";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Users — Admin — ISOLATED.TECH",
};

interface User {
  id: string;
  email: string;
  name: string | null;
  isAdmin: number;
  newsletterSubscribed: number;
  createdAt: string;
  purchase_count: number;
  review_count: number;
  oauth_providers: string[];
}

async function getUsers(): Promise<User[]> {
  const env = getEnv();

  // Get users with purchase and review counts (using Better Auth 'user' table)
  const users = await query<{
    id: string;
    email: string;
    name: string | null;
    isAdmin: number;
    newsletterSubscribed: number;
    createdAt: string;
    purchase_count: number;
    review_count: number;
  }>(
    `SELECT 
       u.id,
       u.email,
       u.name,
       u.isAdmin,
       u.newsletterSubscribed,
       u.createdAt,
       COALESCE((SELECT COUNT(*) FROM purchases WHERE user_id = u.id AND status = 'completed'), 0) as purchase_count,
       COALESCE((SELECT COUNT(*) FROM reviews WHERE user_id = u.id), 0) as review_count
     FROM user u
     ORDER BY u.createdAt DESC`,
    [],
    env
  );

  // Get OAuth providers for each user (Better Auth 'account' table)
  const oauthAccounts = await query<{
    userId: string;
    providerId: string;
  }>(
    `SELECT userId, providerId FROM account`,
    [],
    env
  );

  // Build provider map
  const providerMap = new Map<string, string[]>();
  for (const account of oauthAccounts) {
    const providers = providerMap.get(account.userId) || [];
    providers.push(account.providerId);
    providerMap.set(account.userId, providers);
  }

  // Merge providers into users
  return users.map((user) => ({
    ...user,
    oauth_providers: providerMap.get(user.id) || [],
  }));
}

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

export default async function AdminUsersPage() {
  const users = await getUsers();

  const newsletterCount = users.filter((u) => u.newsletterSubscribed).length;

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

      {users.length > 0 ? (
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
                        {user.isAdmin === 1 && (
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
                    {user.newsletterSubscribed ? (
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
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-table__btn">VIEW</button>
                      {user.isAdmin === 0 && (
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
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No users yet</h2>
          <p className="empty-state__text">
            Users will appear here once they sign up.
          </p>
        </div>
      )}

      {/* Export */}
      {users.length > 0 && (
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
      )}
    </>
  );
}
