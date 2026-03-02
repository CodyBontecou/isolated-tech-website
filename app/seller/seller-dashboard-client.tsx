"use client";

import { useState } from "react";

interface Props {
  action: "onboard" | "stripe-dashboard";
  buttonText?: string;
}

export function SellerDashboardClient({ action, buttonText }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOnboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/seller/onboard", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.details ? `${data.error}: ${data.details}` : data.error;
        throw new Error(message || "Failed to start onboarding");
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/seller/dashboard", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.details ? `${data.error}: ${data.details}` : data.error;
        throw new Error(message || "Failed to get dashboard link");
      }

      // Open Stripe dashboard in new tab
      window.open(data.url, "_blank");
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (action === "onboard") {
    return (
      <div>
        <button
          onClick={handleOnboard}
          disabled={loading}
          className="auth-btn"
          style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "CONNECTING..." : buttonText || "CONNECT WITH STRIPE"}
        </button>
        {error && (
          <p style={{ color: "var(--error)", marginTop: "1rem", fontSize: "0.85rem" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  if (action === "stripe-dashboard") {
    return (
      <button
        onClick={handleStripeDashboard}
        disabled={loading}
        className="dashboard__nav-link"
        style={{ 
          background: "none", 
          border: "none", 
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? "LOADING..." : "STRIPE DASHBOARD ↗"}
      </button>
    );
  }

  return null;
}
