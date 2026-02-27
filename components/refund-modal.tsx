"use client";

import { useState } from "react";

interface RefundModalProps {
  purchaseId: string;
  customerEmail: string;
  appName: string;
  amount: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RefundModal({
  purchaseId,
  customerEmail,
  appName,
  amount,
  onClose,
  onSuccess,
}: RefundModalProps) {
  const [keepAccess, setKeepAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefund = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId,
          keepAccess,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process refund");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process refund");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="refund-overlay" onClick={onClose}>
      <div className="refund-modal" onClick={(e) => e.stopPropagation()}>
        <div className="refund-modal__header">
          <h2 className="refund-modal__title">Process Refund</h2>
          <button
            className="refund-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="refund-modal__body">
          <div className="refund-modal__info">
            <div className="refund-modal__row">
              <span className="refund-modal__label">Customer</span>
              <span className="refund-modal__value">{customerEmail}</span>
            </div>
            <div className="refund-modal__row">
              <span className="refund-modal__label">App</span>
              <span className="refund-modal__value">{appName}</span>
            </div>
            <div className="refund-modal__row">
              <span className="refund-modal__label">Amount</span>
              <span className="refund-modal__value refund-modal__value--amount">
                {amount}
              </span>
            </div>
          </div>

          <div className="refund-modal__option">
            <label className="refund-modal__checkbox-label">
              <input
                type="checkbox"
                checked={keepAccess}
                onChange={(e) => setKeepAccess(e.target.checked)}
                className="refund-modal__checkbox"
              />
              <span className="refund-modal__checkbox-text">
                Allow customer to keep access after refund
              </span>
            </label>
            <p className="refund-modal__option-hint">
              {keepAccess
                ? "Customer will still be able to download and use the app."
                : "Customer will lose access to download the app."}
            </p>
          </div>

          {error && <div className="refund-modal__error">{error}</div>}
        </div>

        <div className="refund-modal__actions">
          <button
            type="button"
            className="refund-modal__btn refund-modal__btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            CANCEL
          </button>
          <button
            type="button"
            className="refund-modal__btn refund-modal__btn--confirm"
            onClick={handleRefund}
            disabled={isSubmitting}
          >
            {isSubmitting ? "PROCESSING..." : "CONFIRM REFUND"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RefundButton({
  purchaseId,
  customerEmail,
  appName,
  amount,
  onRefunded,
}: {
  purchaseId: string;
  customerEmail: string;
  appName: string;
  amount: string;
  onRefunded?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    if (onRefunded) {
      onRefunded();
    } else {
      // Reload the page to show updated status
      window.location.reload();
    }
  };

  return (
    <>
      <button
        className="admin-table__btn admin-table__btn--danger"
        onClick={() => setIsOpen(true)}
      >
        REFUND
      </button>
      {isOpen && (
        <RefundModal
          purchaseId={purchaseId}
          customerEmail={customerEmail}
          appName={appName}
          amount={amount}
          onClose={() => setIsOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
