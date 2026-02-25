"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CodeFormProps {
  apps: { id: string; name: string }[];
  existingCode?: {
    id: string;
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    app_id: string | null;
    max_uses: number | null;
    expires_at: string | null;
    is_active: boolean;
  };
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function CodeForm({ apps, existingCode }: CodeFormProps) {
  const router = useRouter();
  const isEditing = !!existingCode;

  const [code, setCode] = useState(existingCode?.code || "");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    existingCode?.discount_type || "percent"
  );
  const [discountValue, setDiscountValue] = useState(
    existingCode?.discount_value
      ? existingCode.discount_type === "fixed"
        ? (existingCode.discount_value / 100).toString()
        : existingCode.discount_value.toString()
      : ""
  );
  const [appId, setAppId] = useState(existingCode?.app_id || "");
  const [maxUses, setMaxUses] = useState(
    existingCode?.max_uses?.toString() || ""
  );
  const [expiresAt, setExpiresAt] = useState(
    existingCode?.expires_at
      ? new Date(existingCode.expires_at).toISOString().slice(0, 16)
      : ""
  );
  const [isActive, setIsActive] = useState(existingCode?.is_active ?? true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCode = () => {
    setCode(generateCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Code is required");
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }

    if (discountType === "percent" && parseFloat(discountValue) > 100) {
      setError("Percent discount cannot exceed 100%");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing
        ? `/api/admin/codes/${existingCode.id}`
        : "/api/admin/codes";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          discount_type: discountType,
          discount_value:
            discountType === "fixed"
              ? Math.round(parseFloat(discountValue) * 100)
              : parseInt(discountValue),
          app_id: appId || null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          is_active: isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save code");
      }

      router.push("/admin/codes?success=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          className="auth-message auth-message--error"
          style={{ marginBottom: "1.5rem" }}
        >
          {error}
        </div>
      )}

      {/* Code */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">CODE *</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            className="settings-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g., LAUNCH50"
            maxLength={20}
            style={{ flex: 1, fontFamily: "var(--font-mono)", fontWeight: 700 }}
          />
          <button
            type="button"
            className="auth-btn auth-btn--outline"
            onClick={handleGenerateCode}
            style={{ width: "auto", whiteSpace: "nowrap" }}
          >
            GENERATE
          </button>
        </div>
      </div>

      {/* Discount Type & Value */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <label className="settings-label">TYPE *</label>
          <select
            className="settings-input"
            value={discountType}
            onChange={(e) =>
              setDiscountType(e.target.value as "percent" | "fixed")
            }
          >
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="settings-label">
            {discountType === "percent" ? "DISCOUNT %" : "DISCOUNT $"} *
          </label>
          <input
            type="number"
            className="settings-input"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder={discountType === "percent" ? "50" : "5.00"}
            min="0"
            max={discountType === "percent" ? "100" : undefined}
            step={discountType === "percent" ? "1" : "0.01"}
          />
        </div>
      </div>

      {/* App Restriction */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">RESTRICT TO APP (OPTIONAL)</label>
        <select
          className="settings-input"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
        >
          <option value="">All Apps</option>
          {apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
      </div>

      {/* Max Uses */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">MAX USES (OPTIONAL)</label>
        <input
          type="number"
          className="settings-input"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Unlimited"
          min="1"
        />
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
          }}
        >
          Leave blank for unlimited uses
        </p>
      </div>

      {/* Expiration */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">EXPIRES AT (OPTIONAL)</label>
        <input
          type="datetime-local"
          className="settings-input"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      {/* Active */}
      <div style={{ marginBottom: "2rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "crosshair",
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: "1.25rem", height: "1.25rem" }}
          />
          <span className="settings-label" style={{ marginBottom: 0 }}>
            ACTIVE
          </span>
        </label>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--gray)",
            marginTop: "0.25rem",
            marginLeft: "2rem",
          }}
        >
          Inactive codes cannot be used at checkout
        </p>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          className="auth-btn"
          disabled={isSubmitting}
          style={{ width: "auto" }}
        >
          {isSubmitting
            ? "SAVING..."
            : isEditing
              ? "UPDATE CODE"
              : "CREATE CODE"}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          style={{ width: "auto" }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
