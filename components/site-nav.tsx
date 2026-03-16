import { SignOutButton } from "@/components/sign-out-button";
import { MobileSiteNav } from "@/components/mobile-site-nav";

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
  return (
    <nav className="nav">
      <a href="/" className="nav__logo">
        ISOLATED<span className="dot">.</span>TECH
      </a>
      <div className="nav__links">
        <a href="/apps" {...(activePage === "apps" ? { style: { opacity: 1 } } : {})}>APPS</a>
        <a href="/work" {...(activePage === "work" ? { style: { opacity: 1 } } : {})}>WORK</a>
        <a href="/hire" {...(activePage === "hire" ? { style: { opacity: 1 } } : {})}>HIRE</a>
        <a href="/changelog" {...(activePage === "changelog" ? { style: { opacity: 1 } } : {})}>UPDATES</a>
        <a href="/feedback" {...(activePage === "feedback" ? { style: { opacity: 1 } } : {})}>FEEDBACK</a>
        <a href="/roadmap" {...(activePage === "roadmap" ? { style: { opacity: 1 } } : {})}>ROADMAP</a>
        {user ? (
          <>
            {user.isAdmin && <a href="/admin">ADMIN</a>}
            {user.isSeller && !user.isAdmin && <a href="/seller">SELLER</a>}
            <a href="/dashboard">DASHBOARD</a>
            <SignOutButton />
          </>
        ) : (
          <a href={`/auth/login${redirectPath ? `?redirect=${redirectPath}` : ""}`}>SIGN IN</a>
        )}
      </div>
      <MobileSiteNav isLoggedIn={!!user} isAdmin={!!user?.isAdmin} isSeller={!!user?.isSeller} />
    </nav>
  );
}
