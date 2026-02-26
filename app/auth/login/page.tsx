import { Metadata } from "next";
import { LoginForm } from "./login-form";
import { SocialButtons } from "./social-buttons";
import { sanitizeRedirectPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Sign In — ISOLATED.TECH",
  description: "Sign in to your ISOLATED.TECH account to access your purchased apps.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; redirect?: string };
}) {
  const redirectTo = sanitizeRedirectPath(searchParams.redirect);

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
          <h1 className="auth-card__title">Sign In</h1>
          <p className="auth-card__subtitle">
            Access your purchased apps, downloads, and account settings.
          </p>
        </div>

        {searchParams.error && (
          <div className="auth-message auth-message--error">
            {searchParams.error === "invalid_token"
              ? "This magic link is invalid or has expired. Please request a new one."
              : searchParams.error === "oauth_error" || searchParams.error === "OAuthCallbackError"
                ? "There was a problem signing in. Please try again."
                : searchParams.error}
          </div>
        )}

        {searchParams.message && (
          <div className="auth-message auth-message--success">
            {searchParams.message}
          </div>
        )}

        <LoginForm redirect={redirectTo} />

        <div className="auth-divider">
          <div className="auth-divider__line" />
          <span className="auth-divider__text">OR CONTINUE WITH</span>
          <div className="auth-divider__line" />
        </div>

        <SocialButtons redirect={redirectTo} />

        <div className="auth-footer">
          <p className="auth-footer__text">
            By signing in, you agree to our{" "}
            <a href="/terms" className="auth-footer__link">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="auth-footer__link">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
