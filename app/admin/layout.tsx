import { requireAdmin } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";
import { SessionRefresh } from "@/components/session-refresh";
import { MobileAdminNav } from "@/components/mobile-admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = getEnv();

  // This will redirect to /auth/login if not authenticated,
  // or to /dashboard if authenticated but not an admin
  await requireAdmin(env);

  return (
    <>
      <SessionRefresh />
      <MobileAdminNav />
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
              <a href="/admin" className="admin-sidebar__link" title="Dashboard">
                <span>Dashboard</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CATALOG</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/apps" className="admin-sidebar__link" title="Apps">
                <span>Apps</span>
              </a>
              <a href="/admin/codes" className="admin-sidebar__link" title="Discount Codes">
                <span>Discount Codes</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CUSTOMERS</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/purchases" className="admin-sidebar__link" title="Purchases">
                <span>Purchases</span>
              </a>
              <a href="/admin/downloads" className="admin-sidebar__link" title="Downloads">
                <span>Downloads</span>
              </a>
              <a href="/admin/users" className="admin-sidebar__link" title="Users">
                <span>Users</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">SUPPORT</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/feedback" className="admin-sidebar__link" title="Feedback">
                <span>Feedback</span>
              </a>
              <a href="/admin/feature-requests" className="admin-sidebar__link" title="Feature Requests">
                <span>Feature Requests</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">CONTENT</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/blog-posts" className="admin-sidebar__link" title="Blog Posts">
                <span>Blog Posts</span>
              </a>
              <a href="/admin/help-articles" className="admin-sidebar__link" title="Help Articles">
                <span>Help Articles</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">MARKETING</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/subscribers" className="admin-sidebar__link" title="Subscribers">
                <span>Subscribers</span>
              </a>
              <a href="/admin/broadcasts" className="admin-sidebar__link" title="Broadcasts">
                <span>Broadcasts</span>
              </a>
            </nav>
          </div>

          <div className="admin-sidebar__section">
            <div className="admin-sidebar__label">SETTINGS</div>
            <nav className="admin-sidebar__nav">
              <a href="/admin/api-keys" className="admin-sidebar__link" title="API Keys">
                <span>API Keys</span>
              </a>
            </nav>
          </div>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
