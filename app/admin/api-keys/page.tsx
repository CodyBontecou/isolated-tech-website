import { Metadata } from "next";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { ApiKeyActions } from "./actions";

export const metadata: Metadata = {
  title: "API Keys — Admin — ISOLATED.TECH",
};

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  is_revoked: number;
}

async function getApiKeys(): Promise<ApiKey[]> {
  const env = getEnv();

  const keys = await query<ApiKey>(
    `SELECT id, name, key_prefix, created_at, expires_at, last_used_at, is_revoked 
     FROM api_keys 
     ORDER BY created_at DESC`,
    [],
    env
  );

  return keys;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KeyStatus({ apiKey }: { apiKey: ApiKey }) {
  if (apiKey.is_revoked) {
    return (
      <span style={{ color: "#f87171", fontSize: "0.7rem" }}>REVOKED</span>
    );
  }

  if (new Date(apiKey.expires_at) < new Date()) {
    return (
      <span style={{ color: "#f87171", fontSize: "0.7rem" }}>EXPIRED</span>
    );
  }

  return (
    <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>ACTIVE</span>
  );
}

export default async function AdminApiKeysPage() {
  const keys = await getApiKeys();

  return (
    <>
      <header className="admin-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="admin-header__title">API Keys</h1>
            <p className="admin-header__subtitle">
              Manage API keys for CLI and automation access
            </p>
          </div>
        </div>
      </header>

      <ApiKeyActions />

      {keys.length > 0 ? (
        <div className="admin-table-wrap" style={{ marginTop: "2rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>KEY PREFIX</th>
                <th>CREATED</th>
                <th>EXPIRES</th>
                <th>LAST USED</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((apiKey) => (
                <tr key={apiKey.id}>
                  <td>{apiKey.name}</td>
                  <td>
                    <code
                      style={{
                        background: "var(--black)",
                        padding: "0.25rem 0.5rem",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {apiKey.key_prefix}...
                    </code>
                  </td>
                  <td className="admin-table__date">{formatDate(apiKey.created_at)}</td>
                  <td className="admin-table__date">{formatDate(apiKey.expires_at)}</td>
                  <td className="admin-table__date">{formatDate(apiKey.last_used_at)}</td>
                  <td>
                    <KeyStatus apiKey={apiKey} />
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <form action={`/api/admin/api-keys/revoke`} method="POST" style={{ display: "inline" }}>
                        <input type="hidden" name="keyPrefix" value={apiKey.key_prefix} />
                        <button 
                          type="submit"
                          className="admin-table__btn admin-table__btn--danger"
                          disabled={apiKey.is_revoked === 1}
                        >
                          REVOKE
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: "2rem" }}>
          <h2 className="empty-state__title">No API keys yet</h2>
          <p className="empty-state__text">
            Create an API key to enable CLI and automation access.
          </p>
        </div>
      )}

      <div style={{ 
        marginTop: "2rem", 
        padding: "1rem", 
        background: "var(--card)", 
        border: "1px solid var(--border)",
        fontSize: "0.85rem",
        color: "var(--gray)"
      }}>
        <strong style={{ color: "var(--white)" }}>Usage:</strong> Set the API key as an environment variable:
        <pre style={{ 
          marginTop: "0.5rem", 
          padding: "0.5rem", 
          background: "var(--black)",
          overflow: "auto"
        }}>
          export ISOLATED_API_KEY="your-api-key-here"
        </pre>
      </div>
    </>
  );
}
