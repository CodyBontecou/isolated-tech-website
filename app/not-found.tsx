import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function NotFound() {
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
              fontSize: "4rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            404<span className="dot">.</span>
          </h1>

          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--gray)",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            This page doesn&apos;t exist. It may have been moved or deleted.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <Link href="/" className="auth-btn" style={{ width: "auto" }}>
              GO HOME
            </Link>
            <Link
              href="/apps"
              className="auth-btn auth-btn--outline"
              style={{ width: "auto" }}
            >
              BROWSE APPS
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
