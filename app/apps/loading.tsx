import { SiteNav } from "@/components/site-nav";

function AppCardSkeleton() {
  return (
    <div className="store-card" style={{ pointerEvents: 'none' }}>
      <div className="store-card__icon">
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
      </div>
      <div className="store-card__content">
        <div className="store-card__badges">
          <div className="skeleton" style={{ width: '50px', height: '20px' }} />
        </div>
        <div className="skeleton" style={{ width: '70%', height: '1.5rem', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ width: '90%', height: '1rem' }} />
      </div>
      <div className="store-card__footer">
        <div className="skeleton" style={{ width: '60px', height: '1rem' }} />
      </div>
    </div>
  );
}

export default function AppsLoading() {
  return (
    <>
      <SiteNav user={null} activePage="apps" />

      <section className="store-hero store-hero--empty" style={{ minHeight: "40vh" }}>
        <div className="store-hero__content">
          <div className="store-hero__label">ALL APPS</div>
          <h1 className="store-hero__title" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>
            Apps<span className="dot">.</span>
          </h1>
          <p className="store-hero__subtitle">
            Privacy-first iOS and macOS apps. On-device processing, no cloud dependencies.
          </p>
        </div>
        <div className="store-hero__grid" />
      </section>

      <section className="store-section" id="apps">
        <div className="store-section__header">
          <div className="skeleton" style={{ width: '80px', height: '1rem' }} />
          <div className="skeleton" style={{ width: '60px', height: '1rem' }} />
        </div>

        <div className="store-grid">
          <AppCardSkeleton />
          <AppCardSkeleton />
          <AppCardSkeleton />
          <AppCardSkeleton />
        </div>
      </section>

      <footer className="store-footer">
        <div className="store-footer__brand">
          <span className="store-footer__logo">
            ISOLATED<span className="dot">.</span>TECH
          </span>
          <span className="store-footer__tagline">Software that ships.</span>
        </div>
      </footer>
    </>
  );
}
