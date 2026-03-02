"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

interface ConnectDemoClientProps {
  isSignedIn: boolean;
  currentUserLabel: string | null;
}

interface ConnectedAccount {
  userId: string;
  displayName: string;
  email: string;
  accountId: string;
}

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  connectedAccountId: string | null;
  applicationFeeAmount: number | null;
  priceInCents: number | null;
  currency: string | null;
}

interface ConnectStatus {
  accountId: string;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
  transfersCapabilityStatus: string | null;
}

function formatPrice(priceInCents: number | null, currency: string | null): string {
  if (priceInCents == null || !currency) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function ConnectDemoClient({ isSignedIn, currentUserLabel }: ConnectDemoClientProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [hasConnectedAccount, setHasConnectedAccount] = useState(false);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);

  const [name, setName] = useState("Demo Product");
  const [description, setDescription] = useState("Simple platform-level product sold via destination charges.");
  const [priceInCents, setPriceInCents] = useState("2500");
  const [currency, setCurrency] = useState("usd");

  const statusText = useMemo(() => {
    if (!status) return "Not onboarded";
    if (status.readyToReceivePayments && status.onboardingComplete) {
      return "Ready to receive payouts";
    }
    return "Onboarding in progress";
  }, [status]);

  const loadStorefront = async () => {
    const response = await fetch("/api/connect-demo/products", {
      method: "GET",
      cache: "no-store",
    });
    const payload = await readJson<{
      products?: StoreProduct[];
      connectedAccounts?: ConnectedAccount[];
      error?: string;
      details?: string;
    }>(response);

    if (!response.ok) {
      throw new Error(payload.details || payload.error || "Failed to load storefront data.");
    }

    setProducts(payload.products || []);
    setConnectedAccounts(payload.connectedAccounts || []);
  };

  const loadStatus = async () => {
    if (!isSignedIn) return;

    const response = await fetch("/api/connect-demo/status", {
      method: "GET",
      cache: "no-store",
    });

    const payload = await readJson<{
      hasConnectedAccount?: boolean;
      status?: ConnectStatus | null;
      error?: string;
      details?: string;
    }>(response);

    if (!response.ok) {
      throw new Error(payload.details || payload.error || "Failed to fetch onboarding status.");
    }

    setHasConnectedAccount(Boolean(payload.hasConnectedAccount));
    setStatus(payload.status || null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadStorefront();
        if (isSignedIn) {
          await loadStatus();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sample data.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isSignedIn]);

  const handleOnboard = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/connect-demo/onboard", {
        method: "POST",
      });

      const payload = await readJson<{
        onboardingUrl?: string;
        error?: string;
        details?: string;
      }>(response);

      if (!response.ok || !payload.onboardingUrl) {
        throw new Error(payload.details || payload.error || "Failed to create onboarding link.");
      }

      window.location.href = payload.onboardingUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start onboarding.");
      setLoading(false);
    }
  };

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/connect-demo/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          priceInCents: Number(priceInCents),
          currency,
        }),
      });

      const payload = await readJson<{ error?: string; details?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.details || payload.error || "Failed to create product.");
      }

      setMessage("Product created successfully.");
      await loadStorefront();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/connect-demo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const payload = await readJson<{ checkoutUrl?: string; error?: string; details?: string }>(
        response
      );

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.details || payload.error || "Failed to create checkout session.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section style={cardStyle}>
        <h2 style={headingStyle}>1) Connected account onboarding</h2>
        <p style={mutedTextStyle}>
          Signed in as: <strong>{currentUserLabel || "Anonymous"}</strong>
        </p>
        {isSignedIn ? (
          <>
            <p style={{ ...mutedTextStyle, marginTop: "0.5rem" }}>
              Status: <strong>{statusText}</strong>
            </p>
            {hasConnectedAccount && status ? (
              <ul style={{ marginTop: "0.75rem", paddingLeft: "1.2rem", lineHeight: 1.8 }}>
                <li>Account ID: {status.accountId}</li>
                <li>Requirements status: {status.requirementsStatus || "unknown"}</li>
                <li>Transfers capability: {status.transfersCapabilityStatus || "unknown"}</li>
              </ul>
            ) : (
              <p style={{ ...mutedTextStyle, marginTop: "0.75rem" }}>
                No connected account found yet.
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
              <button type="button" onClick={handleOnboard} disabled={loading} style={buttonStyle}>
                Onboard to collect payments
              </button>
              <button
                type="button"
                onClick={() => void loadStatus()}
                disabled={loading}
                style={secondaryButtonStyle}
              >
                Refresh status
              </button>
            </div>
          </>
        ) : (
          <p style={{ ...mutedTextStyle, marginTop: "0.75rem" }}>
            Sign in to create a connected account and list products as a seller.
          </p>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={headingStyle}>2) Create platform products</h2>
        <p style={mutedTextStyle}>
          Products are created on the platform account. Product metadata stores the connected account ID.
        </p>

        <form onSubmit={handleCreateProduct} style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <label style={labelStyle}>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              required
            />
          </label>

          <label style={labelStyle}>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label style={labelStyle}>
              Price (cents)
              <input
                value={priceInCents}
                onChange={(event) => setPriceInCents(event.target.value)}
                inputMode="numeric"
                style={inputStyle}
                required
              />
            </label>

            <label style={labelStyle}>
              Currency
              <input
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                style={inputStyle}
                required
              />
            </label>
          </div>

          <button type="submit" disabled={loading || !isSignedIn} style={buttonStyle}>
            Create product
          </button>
        </form>
      </section>

      <section style={cardStyle}>
        <h2 style={headingStyle}>3) Storefront</h2>

        <p style={mutedTextStyle}>Connected accounts ({connectedAccounts.length})</p>
        <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
          {connectedAccounts.length === 0 ? (
            <p style={mutedTextStyle}>No connected accounts yet.</p>
          ) : (
            connectedAccounts.map((account) => (
              <div key={account.accountId} style={subtleBoxStyle}>
                <strong>{account.displayName}</strong> — {account.accountId}
              </div>
            ))
          )}
        </div>

        <p style={{ ...mutedTextStyle, marginTop: "1rem" }}>Products ({products.length})</p>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
          {products.length === 0 ? (
            <p style={mutedTextStyle}>No products yet.</p>
          ) : (
            products.map((product) => (
              <article key={product.id} style={subtleBoxStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{product.name}</h3>
                    <p style={{ ...mutedTextStyle, marginTop: "0.35rem" }}>
                      {product.description || "No description"}
                    </p>
                    <p style={{ ...mutedTextStyle, marginTop: "0.35rem" }}>
                      Price: {formatPrice(product.priceInCents, product.currency)}
                    </p>
                    <p style={{ ...mutedTextStyle, marginTop: "0.2rem" }}>
                      Destination account: {product.connectedAccountId || "missing"}
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => void handleCheckout(product.id)}
                      disabled={loading || !product.connectedAccountId}
                      style={buttonStyle}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {message && <p style={{ color: "#22c55e", margin: 0 }}>{message}</p>}
      {error && <p style={{ color: "#ef4444", margin: 0 }}>{error}</p>}
    </div>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1rem",
  background: "var(--card-bg)",
};

const subtleBoxStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.75rem",
  background: "rgba(255,255,255,0.03)",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 700,
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: "var(--gray)",
  fontSize: "0.9rem",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  fontSize: "0.85rem",
};

const inputStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.55rem 0.65rem",
  background: "var(--black)",
  color: "var(--text)",
};

const buttonStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "0.55rem 0.8rem",
  background: "var(--text)",
  color: "var(--bg)",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--text)",
};
