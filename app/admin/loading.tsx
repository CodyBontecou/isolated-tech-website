import Link from "next/link";

function StatSkeleton() {
  return (
    <div className="admin-stat">
      <div className="skeleton skeleton-text--sm" style={{ width: "80px", marginBottom: "0.5rem" }} />
      <div className="skeleton skeleton-text--lg" style={{ width: "60px" }} />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="skeleton-table-row">
      <div className="skeleton skeleton-text" style={{ width: "100%" }} />
      <div className="skeleton skeleton-text" style={{ width: "60%" }} />
      <div className="skeleton skeleton-text" style={{ width: "40%" }} />
      <div className="skeleton skeleton-text" style={{ width: "80px" }} />
    </div>
  );
}

export default function AdminLoading() {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/admin" style={{ color: "#4ade80" }}>
            ADMIN
          </Link>
          <Link href="/apps">STORE</Link>
          <span style={{ color: "var(--gray)" }}>SIGN OUT</span>
        </div>
      </nav>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">OVERVIEW</div>
            <nav className="admin-sidebar__nav">
              <span className="admin-sidebar__link admin-sidebar__link--active">
                <span className="admin-sidebar__icon">◉</span>
                <span>Dashboard</span>
              </span>
            </nav>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <div className="skeleton skeleton-text--lg" style={{ width: "150px" }} />
            <div className="skeleton skeleton-text--sm" style={{ width: "250px", marginTop: "0.5rem" }} />
          </header>

          <div className="admin-stats">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>

          <div className="admin-section">
            <div className="skeleton skeleton-text" style={{ width: "180px", marginBottom: "1rem" }} />
            <div className="admin-table-wrap">
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
              <TableRowSkeleton />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
