import type { Metadata } from "vinext";

export const metadata: Metadata = {
  title: "Pi Session Share — ISOLATED.TECH",
  description: "Share pi coding agent sessions with anyone.",
  robots: "noindex",
};

export default function SharePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        paddingTop: "100px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: "600px", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "2.5rem",
            fontWeight: 700,
            marginBottom: "1rem",
            letterSpacing: "-0.02em",
          }}
        >
          PI<span className="dot">.</span>SHARE
        </h1>

        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--gray)",
            lineHeight: 1.7,
            marginBottom: "2rem",
          }}
        >
          Share pi coding agent sessions with anyone.
          <br />
          Use <code style={{ 
            background: "var(--gray-alpha-100)", 
            padding: "0.2em 0.4em", 
            borderRadius: "3px",
            fontSize: "0.85em",
          }}>/export --share</code> in pi to generate a link.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="https://github.com/mariozechner/pi-coding-agent"
            className="auth-btn"
            style={{ width: "auto" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GET PI
          </a>
          <a
            href="/"
            className="auth-btn auth-btn--outline"
            style={{ width: "auto" }}
          >
            BACK TO HOME
          </a>
        </div>
      </div>
    </main>
  );
}
