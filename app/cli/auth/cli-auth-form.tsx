"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CLIAuthForm({ code }: { code: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleAuthorize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cli/auth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to authorize");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "64px",
          height: "64px",
          margin: "0 auto 16px",
          borderRadius: "50%",
          background: "rgba(34, 197, 94, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
        }}>
          ✓
        </div>
        <h2 style={{
          fontSize: "20px",
          fontWeight: "600",
          marginBottom: "8px",
          color: "#fff",
        }}>
          CLI Authorized
        </h2>
        <p style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.6)",
        }}>
          You can close this window and return to your terminal.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px",
          color: "#ef4444",
          fontSize: "14px",
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleAuthorize}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "14px 24px",
          fontSize: "14px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: "#000",
          background: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
          transition: "all 0.2s",
        }}
      >
        {isLoading ? "Authorizing..." : "Authorize CLI"}
      </button>

      <button
        onClick={() => router.push("/")}
        style={{
          width: "100%",
          padding: "14px 24px",
          marginTop: "12px",
          fontSize: "14px",
          fontWeight: "500",
          color: "rgba(255,255,255,0.6)",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
