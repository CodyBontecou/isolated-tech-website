"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface PurchaseCardProps {
  appId: string;
  appSlug: string;
  appName: string;
  minPriceCents: number;
  suggestedPriceCents: number | null;
  isFree: boolean;
  isAuthenticated?: boolean;
  iosAppStoreUrl?: string | null;
  iosAppStoreLabel?: string;
  distributionType?: string;
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
  appSlug,
  appName,
  minPriceCents,
  suggestedPriceCents,
  isFree,
  isAuthenticated = false,
  iosAppStoreUrl = null,
  iosAppStoreLabel = "VIEW ON APP STORE",
  distributionType = "binary",
}: PurchaseCardProps) {
  const isSourceCode = distributionType === "source_code";
  const [price, setPrice] = useState(
    suggestedPriceCents ? (suggestedPriceCents / 100).toFixed(2) : "0.00"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const hasResumedPostAuthAction = useRef(false);

  const priceInCents = Math.round(parseFloat(price || "0") * 100);
  const isValidPrice = priceInCents >= minPriceCents;
  const minPrice = (minPriceCents / 100).toFixed(2);

  // Final price after discount
  const finalPriceCents = discountResult?.valid && discountResult.finalPriceCents !== undefined
    ? discountResult.finalPriceCents
    : priceInCents;

  const startCheckout = useCallback(
    async (checkoutPriceCents: number, checkoutDiscountCode?: string) => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            priceCents: checkoutPriceCents,
            discountCode: checkoutDiscountCode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          // Handle auth redirect and preserve attempted action
          if (res.status === 401) {
            const resumeParams = new URLSearchParams({
              postAuthAction: "checkout",
              appId,
              priceCents: checkoutPriceCents.toString(),
            });

            if (checkoutDiscountCode) {
              resumeParams.set("discountCode", checkoutDiscountCode);
            }

            const redirectPath = `/apps/${appSlug}?${resumeParams.toString()}`;
            window.location.href = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;
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
    },
    [appId, appSlug]
  );

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

    await startCheckout(
      finalPriceCents,
      discountResult?.valid ? discountCode : undefined
    );
  };

  useEffect(() => {
    if (hasResumedPostAuthAction.current) return;

    const params = new URLSearchParams(window.location.search);
    const postAuthAction = params.get("postAuthAction");
    const actionAppId = params.get("appId");

    if (postAuthAction !== "checkout" || actionAppId !== appId) {
      return;
    }

    hasResumedPostAuthAction.current = true;

    const rawPriceCents = params.get("priceCents");
    const parsedPriceCents = rawPriceCents ? Number.parseInt(rawPriceCents, 10) : finalPriceCents;
    const checkoutPriceCents = Number.isFinite(parsedPriceCents) && parsedPriceCents >= 0
      ? parsedPriceCents
      : finalPriceCents;

    const resumeDiscountCode = params.get("discountCode") || undefined;

    setPrice((checkoutPriceCents / 100).toFixed(2));
    if (resumeDiscountCode) {
      setShowDiscount(true);
      setDiscountCode(resumeDiscountCode.toUpperCase());
    }

    ["postAuthAction", "appId", "priceCents", "discountCode"].forEach((key) => {
      params.delete(key);
    });

    const remainingQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);

    void startCheckout(checkoutPriceCents, resumeDiscountCode);
  }, [appId, finalPriceCents, startCheckout]);

  if (isFree) {
    return (
      <div className="purchase-card">
        <div className="purchase-card__price-label">
          {isSourceCode ? "DISTRIBUTION" : "PRICE"}
        </div>
        <div className="purchase-card__price" style={{ color: "#4ade80" }}>
          {isSourceCode ? "Source Code — Free" : "Free"}
        </div>

        <button
          className="purchase-card__btn"
          onClick={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? "LOADING..." : isSourceCode ? "↓ GET SOURCE CODE" : "GET FREE"}
        </button>

        {iosAppStoreUrl && (
          <a
            href={iosAppStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="purchase-card__btn purchase-card__btn--secondary"
          >
            {iosAppStoreLabel}
          </a>
        )}

        <p className="purchase-card__note">
          {isSourceCode
            ? "No payment required. Download the Xcode project source code and build on your device."
            : "No payment required. Create an account to track your downloads."}
        </p>
      </div>
    );
  }

  return (
    <div className="purchase-card">
      <div className="purchase-card__price-label">
        {isSourceCode ? "NAME YOUR PRICE — SOURCE CODE" : "NAME YOUR PRICE"}
      </div>

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
            ? isSourceCode ? "↓ GET SOURCE CODE" : "GET FREE"
            : isSourceCode
              ? `↓ GET SOURCE — $${(finalPriceCents / 100).toFixed(2)}`
              : `PAY $${(finalPriceCents / 100).toFixed(2)}`}
      </button>

      {!isAuthenticated && (
        <button
          className="purchase-card__btn purchase-card__btn--secondary"
          onClick={() => {
            const redirectPath = `/apps/${appSlug}`;
            window.location.href = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;
          }}
        >
          SIGN IN FIRST
        </button>
      )}

      {iosAppStoreUrl && (
        <a
          href={iosAppStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="purchase-card__btn purchase-card__btn--secondary"
        >
          {iosAppStoreLabel}
        </a>
      )}

      <p className="purchase-card__note">
        {isSourceCode
          ? "Secure payment via Stripe. You\u2019ll get instant access to download the Xcode project source code. All prices in USD."
          : "Secure payment via Stripe. You\u2019ll get instant access to download after purchase. All prices in USD."}
      </p>
    </div>
  );
}
