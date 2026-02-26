import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verifying... — ISOLATED.TECH",
};

/**
 * Magic link verification page
 *
 * Better Auth handles the actual verification at /api/auth/magic-link/verify
 * This page shows a loading state while the redirect happens.
 */
export default function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string; callbackURL?: string };
}) {
  // If no token and no error, redirect to login
  if (!searchParams.token && !searchParams.error) {
    redirect("/auth/login");
  }

  // If error, show error state
  if (searchParams.error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <a href="/" className="auth-back-link">
            ← BACK TO HOME
          </a>

          <div className="auth-card__header">
            <div className="auth-card__logo">
              ISOLATED<span className="dot">.</span>TECH
            </div>
            <h1 className="auth-card__title">Verification Failed</h1>
          </div>

          <div className="auth-message auth-message--error">
            {searchParams.error === "invalid_token" ||
            searchParams.error === "INVALID_TOKEN"
              ? "This magic link is invalid or has expired."
              : searchParams.error === "expired" ||
                  searchParams.error === "TOKEN_EXPIRED"
                ? "This magic link has expired."
                : "Something went wrong during verification."}
          </div>

          <a
            href="/auth/login"
            className="auth-btn"
            style={{ display: "block", textAlign: "center" }}
          >
            TRY AGAIN
          </a>
        </div>
      </div>
    );
  }

  // Build the verification URL for Better Auth
  const verifyUrl = `/api/auth/magic-link/verify?token=${encodeURIComponent(searchParams.token!)}${
    searchParams.callbackURL
      ? `&callbackURL=${encodeURIComponent(searchParams.callbackURL)}`
      : "&callbackURL=/dashboard"
  }`;

  // Show loading state (actual verification happens via Better Auth)
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div className="auth-card__logo">
            ISOLATED<span className="dot">.</span>TECH
          </div>
          <h1 className="auth-card__title">Verifying...</h1>
          <p className="auth-card__subtitle">
            Please wait while we verify your magic link.
          </p>
        </div>

        <div className="auth-message auth-message--info">
          If you are not redirected automatically,{" "}
          <a href={verifyUrl} className="auth-footer__link">
            click here
          </a>
          .
        </div>

        {/* Client-side redirect to Better Auth verification endpoint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.href = "${verifyUrl}";`,
          }}
        />
      </div>
    </div>
  );
}
