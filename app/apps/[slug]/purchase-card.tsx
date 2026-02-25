"use client";

import { useState, useCallback } from "react";

interface PurchaseCardProps {
  appId: string;
  appName: string;
  minPriceCents: number;
  suggestedPriceCents: number | null;
  isFree: boolean;
  isAuthenticated?: boolean;
}

interface DiscountResult {
  valid: boolean;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountAmountCents?: number;
  finalPriceCents?: number;
  message?: string;
  error?: string;
}

export function PurchaseCard({
  appId,
  appName,
  minPriceCents,
  suggestedPriceCents,
  isFree,
  isAuthenticated = false,
}: PurchaseCardProps) {
  const [price, setPrice] = useState(
    suggestedPriceCents ? (suggestedPriceCents / 100).toFixed(2) : "0.00"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  const priceInCents = Math.round(parseFloat(price || "0") * 100);
  const isValidPrice = priceInCents >= minPriceCents;
  const minPrice = (minPriceCents / 100).toFixed(2);

  // Final price after discount
  const finalPriceCents = discountResult?.valid && discountResult.finalPriceCents !== undefined
    ? discountResult.finalPriceCents
    : priceInCents;

  const validateDiscount = useCallback(async () => {
    if (!discountCode.trim()) {
      setDiscountResult({ valid: false, error: "Please enter a discount code" });
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountResult(null);

    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode,
          appId,
          originalPriceCents: priceInCents,
        }),
      });

      const data: DiscountResult = await res.json();
      setDiscountResult(data);
    } catch (error) {
      console.error("Discount validation error:", error);
      setDiscountResult({ valid: false, error: "Failed to validate code" });
    } finally {
      setIsValidatingDiscount(false);
    }
  }, [discountCode, appId, priceInCents]);

  const clearDiscount = () => {
    setDiscountCode("");
    setDiscountResult(null);
    setShowDiscount(false);
  };

  const handlePurchase = async () => {
    if (!isValidPrice && !isFree) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          priceCents: finalPriceCents,
          discountCode: discountResult?.valid ? discountCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle auth redirect
        if (res.status === 401) {
          window.location.href = `/auth/login?redirect=/apps/${appId}`;
          return;
        }
        alert(data.error || "Failed to create checkout session");
        return;
      }

      // Handle free purchase
      if (data.free && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // Redirect to Stripe
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFree) {
    return (
      <div className="purchase-card">
        <div className="purchase-card__price-label">PRICE</div>
        <div className="purchase-card__price" style={{ color: "#4ade80" }}>
          Free
        </div>

        <button
          className="purchase-card__btn"
          onClick={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? "LOADING..." : "GET FREE"}
        </button>

        <p className="purchase-card__note">
          No payment required. Create an account to track your downloads.
        </p>
      </div>
    );
  }

  return (
    <div className="purchase-card">
      <div className="purchase-card__price-label">NAME YOUR PRICE</div>

      <div className="purchase-card__input-wrapper">
        <span className="purchase-card__currency">$</span>
        <input
          type="number"
          className="purchase-card__input"
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            // Clear discount when price changes
            if (discountResult?.valid) {
              setDiscountResult(null);
            }
          }}
          min={minPrice}
          step="0.01"
          placeholder={minPrice}
        />
      </div>

      {suggestedPriceCents && suggestedPriceCents > 0 && (
        <p className="purchase-card__suggested">
          Suggested: ${(suggestedPriceCents / 100).toFixed(2)}
          {minPriceCents > 0 && ` • Minimum: $${minPrice}`}
        </p>
      )}

      {!isValidPrice && priceInCents > 0 && (
        <p style={{ color: "#f87171", fontSize: "0.75rem", marginBottom: "1rem" }}>
          Minimum price is ${minPrice}
        </p>
      )}

      {/* Discount Section */}
      {showDiscount ? (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              className="auth-input"
              placeholder="DISCOUNT CODE"
              value={discountCode}
              onChange={(e) => {
                setDiscountCode(e.target.value.toUpperCase());
                setDiscountResult(null);
              }}
              disabled={discountResult?.valid}
              style={{ flex: 1, padding: "0.6rem" }}
            />
            {!discountResult?.valid ? (
              <button
                type="button"
                className="purchase-card__btn"
                onClick={validateDiscount}
                disabled={isValidatingDiscount || !discountCode.trim()}
                style={{ width: "auto", padding: "0.6rem 1rem" }}
              >
                {isValidatingDiscount ? "..." : "APPLY"}
              </button>
            ) : (
              <button
                type="button"
                className="purchase-card__btn purchase-card__btn--secondary"
                onClick={clearDiscount}
                style={{ width: "auto", padding: "0.6rem 1rem" }}
              >
                CLEAR
              </button>
            )}
          </div>

          {discountResult && (
            <p
              style={{
                fontSize: "0.75rem",
                color: discountResult.valid ? "#4ade80" : "#f87171",
                marginTop: "0.5rem",
              }}
            >
              {discountResult.valid
                ? `✓ ${discountResult.message} (-$${((discountResult.discountAmountCents || 0) / 100).toFixed(2)})`
                : `✗ ${discountResult.error}`}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDiscount(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--gray)",
            fontSize: "0.7rem",
            cursor: "crosshair",
            marginBottom: "1rem",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          Have a discount code?
        </button>
      )}

      {/* Final Price Display (if discounted) */}
      {discountResult?.valid && finalPriceCents !== priceInCents && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            background: "rgba(74, 222, 128, 0.1)",
            border: "1px solid #4ade80",
          }}
        >
          <div style={{ fontSize: "0.65rem", color: "#4ade80", marginBottom: "0.25rem" }}>
            DISCOUNTED PRICE
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#4ade80" }}>
            ${(finalPriceCents / 100).toFixed(2)}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--gray)", textDecoration: "line-through" }}>
            Was ${price}
          </div>
        </div>
      )}

      <button
        className="purchase-card__btn"
        onClick={handlePurchase}
        disabled={isLoading || !isValidPrice}
      >
        {isLoading
          ? "LOADING..."
          : finalPriceCents === 0
            ? "GET FREE"
            : `PAY $${(finalPriceCents / 100).toFixed(2)}`}
      </button>

      {!isAuthenticated && (
        <button
          className="purchase-card__btn purchase-card__btn--secondary"
          onClick={() => (window.location.href = "/auth/login")}
        >
          SIGN IN FIRST
        </button>
      )}

      <p className="purchase-card__note">
        Secure payment via Stripe. You&apos;ll get instant access to download
        after purchase. All prices in USD.
      </p>
    </div>
  );
}
