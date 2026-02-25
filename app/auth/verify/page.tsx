import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verifying... — ISOLATED.TECH",
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  // If no token, redirect to login
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
            {searchParams.error === "invalid_token"
              ? "This magic link is invalid or has expired."
              : searchParams.error === "expired"
                ? "This magic link has expired."
                : "Something went wrong during verification."}
          </div>

          <a href="/auth/login" className="auth-btn" style={{ display: "block", textAlign: "center" }}>
            TRY AGAIN
          </a>
        </div>
      </div>
    );
  }

  // Show loading state (actual verification happens via API route that sets cookie)
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
          <a
            href={`/api/auth/verify?token=${searchParams.token}`}
            className="auth-footer__link"
          >
            click here
          </a>
          .
        </div>

        {/* Client-side redirect */}
        <VerifyClient token={searchParams.token!} />
      </div>
    </div>
  );
}

function VerifyClient({ token }: { token: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.href = "/api/auth/verify?token=${encodeURIComponent(token)}";`,
      }}
    />
  );
}
