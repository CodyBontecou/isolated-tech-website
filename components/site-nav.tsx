import { SignOutButton } from "@/components/sign-out-button";
import { MobileSiteNav } from "@/components/mobile-site-nav";
import { BrandMark } from "@/components/brand-mark";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface SiteNavUser {
  isAdmin?: boolean;
  isSeller?: boolean;
}

interface SiteNavProps {
  user: SiteNavUser | null;
  /** Current page identifier for highlighting active link */
  activePage?: "apps" | "work" | "hire" | "feedback" | "roadmap" | "changelog";
  /** Login redirect path (defaults to current page) */
  redirectPath?: string;
}

export function SiteNav({ user, activePage, redirectPath }: SiteNavProps) {
  const current = (page: SiteNavProps["activePage"]) =>
    activePage === page ? { "aria-current": "page" as const } : {};

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav__inner">
        <a href="/" className="nav__logo">
          <BrandMark />
          <span className="nav__wordmark">
            ISOLATED<span className="dot">.</span>TECH
          </span>
        </a>
        <div className="nav__links">
          <a href="/apps" {...current("apps")}>APPS</a>
          <a href="/work" {...current("work")}>WORK</a>
          <a href="/changelog" {...current("changelog")}>UPDATES</a>
          {user ? (
            <>
              {user.isAdmin && <a href="/admin">ADMIN</a>}
              {isFeatureEnabled("sellerProgram") && user.isSeller && !user.isAdmin && <a href="/seller">SELLER</a>}
              <a href="/dashboard">DASHBOARD</a>
              <SignOutButton />
            </>
          ) : (
            <a
              href={`/auth/login${redirectPath ? `?redirect=${redirectPath}` : ""}`}
              className="nav__pill"
            >
              SIGN IN
            </a>
          )}
          <a href="/hire" className="nav__pill nav__pill--primary" {...current("hire")}>
            HIRE
          </a>
        </div>
        <MobileSiteNav isLoggedIn={!!user} isAdmin={!!user?.isAdmin} isSeller={!!user?.isSeller} />
      </div>
    </nav>
  );
}
