import { SignOutButton } from "@/components/sign-out-button";
import type { AppPageUser } from "./types";

interface AppNavProps {
  user: AppPageUser | null;
  redirectPath?: string;
  className?: string;
}

export function AppNav({ user, redirectPath = "/apps", className = "" }: AppNavProps) {
  return (
    <nav className={`nav ${className}`.trim()}>
      <a href="/" className="nav__logo">
        ISOLATED<span className="dot">.</span>TECH
      </a>
      <div className="nav__links">
        <a href="/apps">APPS</a>
        {user ? (
          <>
            {user.isAdmin && <a href="/admin">ADMIN</a>}
            <a href="/dashboard">DASHBOARD</a>
            <SignOutButton />
          </>
        ) : (
          <a href={`/auth/login?redirect=${redirectPath}`}>SIGN IN</a>
        )}
      </div>
    </nav>
  );
}
