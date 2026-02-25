import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Add requireAdmin() check here
  // const user = await requireAdmin(env);

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
          <Link href="/api/auth/logout">SIGN OUT</Link>
        </div>
      </nav>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">OVERVIEW</div>
            <nav className="admin-sidebar__nav">
              <Link href="/admin" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">◉</span>
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CATALOG</div>
            <nav className="admin-sidebar__nav">
              <Link href="/admin/apps" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">□</span>
                <span>Apps</span>
              </Link>
              <Link href="/admin/codes" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">%</span>
                <span>Discount Codes</span>
              </Link>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CUSTOMERS</div>
            <nav className="admin-sidebar__nav">
              <Link href="/admin/purchases" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">$</span>
                <span>Purchases</span>
              </Link>
              <Link href="/admin/users" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">◎</span>
                <span>Users</span>
              </Link>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">MARKETING</div>
            <nav className="admin-sidebar__nav">
              <Link href="/admin/broadcast" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">✉</span>
                <span>Broadcast</span>
              </Link>
            </nav>
          </div>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
