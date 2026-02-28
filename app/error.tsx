"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SiteNav } from "@/components/site-nav";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error);
  }, [error]);

  return (
    <>
      <SiteNav user={null} />

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          paddingTop: "100px",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "3rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            500<span className="dot">.</span>
          </h1>

          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--gray)",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            Something went wrong. We&apos;ve been notified and are looking into it.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--gray)",
                marginBottom: "2rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              className="auth-btn"
              style={{ width: "auto" }}
            >
              TRY AGAIN
            </button>
            <Link
              href="/"
              className="auth-btn auth-btn--outline"
              style={{ width: "auto" }}
            >
              GO HOME
            </Link>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
