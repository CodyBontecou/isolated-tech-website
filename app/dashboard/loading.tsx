import Link from "next/link";

function PurchasedAppSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__header">
        <div className="skeleton skeleton-card__icon" />
        <div className="skeleton-card__info">
          <div className="skeleton skeleton-text" style={{ width: "60%" }} />
          <div className="skeleton skeleton-text--sm" />
        </div>
      </div>
      <div className="skeleton skeleton-card__btn" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <>
      <nav className="nav">
        {/* Use <a> tag to force full page navigation - vinext RSC fetch doesn't include credentials */}
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/apps">APPS</a>
          <span style={{ color: "var(--gray)" }}>SIGN OUT</span>
        </div>
      </nav>

      <main className="dashboard">
        <header className="dashboard__header">
          <div className="skeleton skeleton-text--sm" style={{ width: "100px", marginBottom: "0.5rem" }} />
          <div className="skeleton skeleton-text--lg" style={{ width: "200px" }} />

          <nav className="dashboard__nav" style={{ marginTop: "2rem" }}>
            <span className="dashboard__nav-link dashboard__nav-link--active">MY APPS</span>
            <span className="dashboard__nav-link">REVIEWS</span>
            <span className="dashboard__nav-link">SETTINGS</span>
          </nav>
        </header>

        <div className="skeleton skeleton-text--sm" style={{ width: "120px", marginBottom: "1rem" }} />

        <div className="purchased-grid">
          <PurchasedAppSkeleton />
          <PurchasedAppSkeleton />
        </div>
      </main>
    </>
  );
}
