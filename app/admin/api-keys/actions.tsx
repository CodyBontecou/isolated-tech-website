"use client";

import { useState } from "react";

export function ApiKeyActions() {
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("cli-access");
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create API key");
      }

      const data = await res.json();
      setNewKey({ key: data.key, expiresAt: data.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (newKey) {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDismiss() {
    setNewKey(null);
    setName("cli-access");
    // Refresh to show the new key in the list
    window.location.reload();
  }

  if (newKey) {
    return (
      <div style={{
        marginTop: "1.5rem",
        padding: "1.5rem",
        background: "var(--card)",
        border: "2px solid #4ade80",
      }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#4ade80" }}>
          ✓ API Key Created
        </h3>
        <p style={{ color: "var(--gray)", fontSize: "0.85rem", margin: "0 0 1rem 0" }}>
          Copy this key now — it won't be shown again!
        </p>
        <div style={{ 
          display: "flex", 
          gap: "0.5rem", 
          alignItems: "center",
          background: "var(--black)",
          padding: "0.75rem",
          marginBottom: "1rem"
        }}>
          <code style={{ 
            flex: 1, 
            fontFamily: "var(--font-mono)", 
            fontSize: "0.9rem",
            wordBreak: "break-all"
          }}>
            {newKey.key}
          </code>
          <button
            onClick={handleCopy}
            className="auth-btn"
            style={{ 
              width: "auto", 
              padding: "0.5rem 1rem",
              background: copied ? "#4ade80" : undefined,
              color: copied ? "var(--black)" : undefined
            }}
          >
            {copied ? "COPIED!" : "COPY"}
          </button>
        </div>
        <p style={{ color: "var(--gray)", fontSize: "0.75rem", margin: "0 0 1rem 0" }}>
          Expires: {new Date(newKey.expiresAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric"
          })} (30 days)
        </p>
        <button 
          onClick={handleDismiss}
          className="auth-btn"
          style={{ width: "auto" }}
        >
          DONE
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: "1.5rem",
      padding: "1.5rem",
      background: "var(--card)",
      border: "1px solid var(--border)",
    }}>
      <h3 style={{ margin: "0 0 1rem 0" }}>Generate New API Key</h3>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ 
            display: "block", 
            marginBottom: "0.5rem", 
            fontSize: "0.75rem",
            color: "var(--gray)",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            Key Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., cli-access, ci-deploy"
            className="auth-input"
            style={{ width: "100%" }}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating || !name.trim()}
          className="auth-btn"
          style={{ width: "auto", padding: "0.75rem 1.5rem" }}
        >
          {isCreating ? "GENERATING..." : "+ GENERATE KEY"}
        </button>
      </div>
      {error && (
        <p style={{ color: "#f87171", marginTop: "1rem", fontSize: "0.85rem" }}>
          Error: {error}
        </p>
      )}
      <p style={{ 
        marginTop: "1rem", 
        fontSize: "0.75rem", 
        color: "var(--gray)" 
      }}>
        Keys expire after 30 days. The full key is only shown once at creation time.
      </p>
    </div>
  );
}
