import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

function AppCardSkeleton() {
  return (
    <div className="app-card-skeleton">
      <div className="skeleton app-card-skeleton__icon" />
      <div className="skeleton app-card-skeleton__title" />
      <div className="skeleton app-card-skeleton__desc" />
      <div className="app-card-skeleton__badges">
        <div className="skeleton app-card-skeleton__badge" />
        <div className="skeleton app-card-skeleton__badge" />
      </div>
    </div>
  );
}

export default async function AppsLoading() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/apps">APPS</Link>
          <Link href="/#about">ABOUT</Link>
          {user ? (
            <>
              <Link href="/dashboard">DASHBOARD</Link>
              <Link href="/api/auth/logout">SIGN OUT</Link>
            </>
          ) : (
            <Link href="/auth/login">SIGN IN</Link>
          )}
        </div>
      </nav>

      <main className="catalog">
        <header className="catalog__header">
          <p className="catalog__label">CATALOG</p>
          <h1 className="catalog__title">
            Apps<span className="dot">.</span>
          </h1>
        </header>

        <div className="catalog__grid">
          <AppCardSkeleton />
          <AppCardSkeleton />
          <AppCardSkeleton />
          <AppCardSkeleton />
        </div>
      </main>
    </>
  );
}
