"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export function ImportForm() {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [source, setSource] = useState("gumroad");
  const [productName, setProductName] = useState("Ikigai");
  const [createLegacyPurchases, setCreateLegacyPurchases] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/subscribers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: emails.trim(),
          source,
          productName: createLegacyPurchases ? productName : null,
          createLegacyPurchases,
        }),
      });

      const data = (await response.json()) as ImportResult;
      setResult(data);

      if (data.success && data.imported > 0) {
        setTimeout(() => router.push("/admin/subscribers"), 2000);
      }
    } catch {
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: ["Network error"],
      });
    } finally {
      setLoading(false);
    }
  };

  const emailCount = emails
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter((e) => e.includes("@")).length;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "600px" }}>
      {/* Source */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.7rem",
            letterSpacing: "1px",
            color: "#666",
            marginBottom: "0.5rem",
          }}
        >
          SOURCE
        </label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="settings-input"
          style={{ width: "100%" }}
        >
          <option value="gumroad">Gumroad</option>
          <option value="import">Manual Import</option>
          <option value="website">Website Signup</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Emails */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.7rem",
            letterSpacing: "1px",
            color: "#666",
            marginBottom: "0.5rem",
          }}
        >
          EMAIL ADDRESSES ({emailCount} detected)
        </label>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          className="settings-input"
          placeholder="email@example.com&#10;another@example.com&#10;&#10;Or paste CSV: email,name"
          rows={12}
          style={{
            width: "100%",
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        />
        <p style={{ fontSize: "0.7rem", color: "#666", marginTop: "0.5rem" }}>
          One email per line, or comma-separated. Optionally include names: email,name
        </p>
      </div>

      {/* Legacy Purchases */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={createLegacyPurchases}
            onChange={(e) => setCreateLegacyPurchases(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span style={{ fontSize: "0.85rem" }}>
            Create legacy purchases (auto-claim when they sign up)
          </span>
        </label>
      </div>

      {/* Product Name */}
      {createLegacyPurchases && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.7rem",
              letterSpacing: "1px",
              color: "#666",
              marginBottom: "0.5rem",
            }}
          >
            PRODUCT NAME
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="settings-input"
            placeholder="Ikigai"
            style={{ width: "100%" }}
          />
          <p style={{ fontSize: "0.7rem", color: "#666", marginTop: "0.5rem" }}>
            The product these customers purchased on Gumroad
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            background: result.success ? "#14532d" : "#7f1d1d",
            border: `1px solid ${result.success ? "#22c55e" : "#ef4444"}`,
          }}
        >
          {result.success ? (
            <>
              <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                ✓ Imported {result.imported} subscriber{result.imported !== 1 ? "s" : ""}
              </p>
              {result.skipped > 0 && (
                <p style={{ fontSize: "0.85rem", color: "#999" }}>
                  {result.skipped} skipped (already exist)
                </p>
              )}
            </>
          ) : (
            <>
              <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Import failed</p>
              {result.errors.map((err, i) => (
                <p key={i} style={{ fontSize: "0.85rem", color: "#fca5a5" }}>
                  {err}
                </p>
              ))}
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          className="auth-btn"
          disabled={loading || emailCount === 0}
          style={{
            width: "auto",
            padding: "0.75rem 1.5rem",
            opacity: loading || emailCount === 0 ? 0.5 : 1,
          }}
        >
          {loading ? "IMPORTING..." : `IMPORT ${emailCount} EMAIL${emailCount !== 1 ? "S" : ""}`}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="auth-btn auth-btn--outline"
          style={{ width: "auto", padding: "0.75rem 1.5rem" }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
