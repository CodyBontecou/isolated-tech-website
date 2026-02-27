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
  hasPurchased?: boolean;
  iosAppStoreUrl?: string | null;
  iosAppStoreLabel?: string;
  subscriptionNote?: string | null;
  hasMacOS?: boolean;
  hasIOS?: boolean;
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
  hasPurchased = false,
  iosAppStoreUrl = null,
  iosAppStoreLabel = "DOWNLOAD ON APP STORE (iOS)",
  subscriptionNote = null,
  hasMacOS = false,
  hasIOS = false,
}: PurchaseCardProps) {
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

        if (data.free && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }

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

  // Already purchased - show download options
  if (hasPurchased) {
    return (
      <div className="purchase-card">
        <div className="purchase-card__price-label">STATUS</div>
        <div className="purchase-card__price" style={{ color: "#4ade80", marginBottom: "1rem" }}>
          ✓ Owned
        </div>

        {hasMacOS && (
          <>
            <a
              href="/dashboard"
              className="purchase-card__btn"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              ↓ DOWNLOAD FOR MAC
            </a>
            <p className="purchase-card__note">
              Download the macOS app from your dashboard.
            </p>
          </>
        )}

        {iosAppStoreUrl && (
          <a
            href={iosAppStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="purchase-card__btn purchase-card__btn--secondary"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            {iosAppStoreLabel}
          </a>
        )}
      </div>
    );
  }

  // iOS-only app - just show App Store link
  if (hasIOS && !hasMacOS && iosAppStoreUrl) {
    return (
      <div className="purchase-card">
        <div className="purchase-card__price-label">AVAILABLE ON</div>
        <div className="purchase-card__price" style={{ marginBottom: "1rem" }}>
          App Store
        </div>

        <a
          href={iosAppStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="purchase-card__btn"
          style={{ display: "block", textAlign: "center", textDecoration: "none" }}
        >
          {iosAppStoreLabel}
        </a>

        <p className="purchase-card__note">
          Download from the iOS App Store.
        </p>

        {subscriptionNote && (
          <p className="purchase-card__note" style={{ marginTop: "0.75rem" }}>
            {subscriptionNote}
          </p>
        )}
      </div>
    );
  }

  // macOS app - always show name your price
  if (hasMacOS) {
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
              if (discountResult?.valid) {
                setDiscountResult(null);
              }
            }}
            min={minPrice}
            step="0.01"
            placeholder={minPrice}
          />
        </div>

        {suggestedPriceCents && suggestedPriceCents > 0 ? (
          <p className="purchase-card__suggested">
            Suggested: ${(suggestedPriceCents / 100).toFixed(2)}
            {minPriceCents > 0 && ` • Minimum: $${minPrice}`}
          </p>
        ) : null}

        {!isValidPrice && priceInCents > 0 && (
          <p style={{ color: "#f87171", fontSize: "0.75rem", marginBottom: "1rem" }}>
            Minimum price is ${minPrice}
          </p>
        )}

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
              ? "↓ GET FOR MAC — FREE"
              : `↓ GET FOR MAC — $${(finalPriceCents / 100).toFixed(2)}`}
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

        <p className="purchase-card__note">
          Secure payment via Stripe. Instant access after purchase.
        </p>

        {iosAppStoreUrl ? (
          <>
            <a
              href={iosAppStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="purchase-card__btn purchase-card__btn--secondary"
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              {iosAppStoreLabel}
            </a>
            {subscriptionNote && (
              <p className="purchase-card__note" style={{ marginTop: "0.75rem" }}>
                {subscriptionNote}
              </p>
            )}
          </>
        ) : hasIOS ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              border: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.65rem", color: "var(--gray)", marginBottom: "0.25rem" }}>
              iOS
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>
              Coming Soon
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Fallback: iOS-only with no App Store URL configured
  return (
    <div className="purchase-card">
      <div className="purchase-card__price-label">COMING SOON</div>
      <p className="purchase-card__note">
        This app will be available on the App Store soon.
      </p>
    </div>
  );
}
