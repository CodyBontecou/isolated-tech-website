import Link from "next/link";
import { requireAdmin } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = getEnv();
  
  // This will redirect to /auth/login if not authenticated,
  // or to /dashboard if authenticated but not an admin
  const user = await requireAdmin(env);

  return (
    <>
      <nav className="nav">
        {/* Use <a> tag to force full page navigation - vinext RSC fetch doesn't include credentials */}
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/admin" style={{ color: "#4ade80" }}>
            ADMIN
          </a>
          <a href="/apps">STORE</a>
          <SignOutButton />
        </div>
      </nav>

      <div className="admin-layout">
        {/* Use <a> tags for sidebar nav - vinext RSC fetch doesn't include credentials */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">OVERVIEW</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">◉</span>
                <span>Dashboard</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CATALOG</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/apps" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">☎</span>
                <span>Apps</span>
              </a>
              <a href="/admin/codes" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">%</span>
                <span>Discount Codes</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CUSTOMERS</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/purchases" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">$</span>
                <span>Purchases</span>
              </a>
              <a href="/admin/users" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">◎</span>
                <span>Users</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">SUPPORT</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/feedback" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">💬</span>
                <span>Feedback</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">MARKETING</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/broadcast" className="admin-sidebar__link">
                <span className="admin-sidebar__icon">✉</span>
                <span>Broadcast</span>
              </a>
            </nav>
          </div>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
