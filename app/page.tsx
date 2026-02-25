import { PROJECTS } from "@/lib/projects";
import { Showcase } from "@/components/showcase";
import { StatsBar } from "@/components/stats-bar";
import { ProjectCards } from "@/components/project-cards";
import { ScrollRevealInit } from "@/components/scroll-reveal";

export default function HomePage() {
  const iosApps = PROJECTS.filter((p) => p.platforms.includes("ios")).length;
  const websites = PROJECTS.filter((p) => p.platforms.includes("web")).length;

  return (
    <>
      <ScrollRevealInit />

      {/* NAV */}
      <nav className="nav">
        <div className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </div>
        <div className="nav__links">
          <a href="#work">WORK</a>
          <a href="#about">ABOUT</a>
          <a href="#contact">CONTACT</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero__image-wrap">
          <img
            src="/assets/photos/_MG_2813.jpg"
            alt="Isolated Tech team"
            className="hero__image"
          />
          <div className="hero__image-overlay" />
        </div>
        <div className="hero__content">
          <div className="hero__label">SOFTWARE STUDIO — EST. 2024</div>
          <h1 className="hero__title">
            <span className="hero__title-line">WE BUILD</span>
            <span className="hero__title-line">
              SOFTWARE<span className="dot">.</span>
            </span>
          </h1>
          <p className="hero__sub">
            Websites. iOS apps. No fluff. No frameworks-of-the-week.
            <br />
            Just raw, functional software that ships.
          </p>
          <div className="hero__cta">
            <a href="#work" className="btn btn--primary">
              SEE THE WORK ↓
            </a>
            <a href="#contact" className="btn btn--ghost">
              GET IN TOUCH
            </a>
          </div>
        </div>
        <div className="hero__scroll-indicator">
          <span>SCROLL</span>
          <div className="hero__scroll-line" />
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee__track">
          <span>
            WEBSITES &nbsp;•&nbsp; iOS APPS &nbsp;•&nbsp; BRUTALIST DESIGN
            &nbsp;•&nbsp; SWIFT &nbsp;•&nbsp; FULL-STACK &nbsp;•&nbsp; ON-DEVICE
            &nbsp;•&nbsp; PRIVACY-FIRST &nbsp;•&nbsp; SHIP FAST &nbsp;•&nbsp;
          </span>
          <span>
            WEBSITES &nbsp;•&nbsp; iOS APPS &nbsp;•&nbsp; BRUTALIST DESIGN
            &nbsp;•&nbsp; SWIFT &nbsp;•&nbsp; FULL-STACK &nbsp;•&nbsp; ON-DEVICE
            &nbsp;•&nbsp; PRIVACY-FIRST &nbsp;•&nbsp; SHIP FAST &nbsp;•&nbsp;
          </span>
        </div>
      </div>

      {/* WORK */}
      <section className="work" id="work">
        <div className="section-header">
          <span className="section-header__index">01</span>
          <span className="section-header__label">/ WORK</span>
        </div>
        <h2 className="section-title">
          SELECTED
          <br />
          PROJECTS<span className="dot">.</span>
        </h2>

        {/* Mobile: project cards grid */}
        <ProjectCards projects={PROJECTS} />

        <div className="work__discovery">
          <span className="work__discovery-dot work__discovery-dot--live" />
          <span className="work__discovery-text">
            {PROJECTS.length} projects loaded
          </span>
        </div>
      </section>

      {/* SHOWCASE: Full-viewport scroll-driven project browser (desktop) */}
      <Showcase projects={PROJECTS} />

      {/* STATS BAR */}
      <StatsBar
        totalProducts={PROJECTS.length}
        iosApps={iosApps}
        websites={websites}
      />

      {/* ABOUT */}
      <section className="about" id="about">
        <div className="section-header">
          <span className="section-header__index">02</span>
          <span className="section-header__label">/ ABOUT</span>
        </div>
        <div className="about__grid">
          <div className="about__text">
            <h2 className="section-title">
              THE
              <br />
              STUDIO<span className="dot">.</span>
            </h2>
            <p className="about__description">
              We&apos;re a small, intentional studio that believes software
              should be direct — not decorated. Every product we ship reflects a
              commitment to clarity, performance, and honest design.
            </p>
            <p className="about__description">
              Our work spans iOS native apps and web platforms. We favor
              on-device processing, privacy-first architecture, and interfaces
              that get out of the way. No bloat. No trends. Just tools that
              work.
            </p>
            <div className="about__capabilities">
              <div className="capability">
                <span className="capability__marker">■</span>
                <span>iOS / Swift / SwiftUI</span>
              </div>
              <div className="capability">
                <span className="capability__marker">■</span>
                <span>WEB / FULL-STACK</span>
              </div>
              <div className="capability">
                <span className="capability__marker">■</span>
                <span>UI/UX DESIGN</span>
              </div>
              <div className="capability">
                <span className="capability__marker">■</span>
                <span>BRUTALIST BRANDING</span>
              </div>
            </div>
          </div>
          <div className="about__images">
            <div className="about__image-stack">
              <img
                src="/assets/photos/_MG_2793.jpg"
                alt="Team close-up"
                className="about__image about__image--front"
              />
              <img
                src="/assets/photos/_MG_2727.jpg"
                alt="Team silhouette"
                className="about__image about__image--back"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact" id="contact">
        <div className="section-header">
          <span className="section-header__index">03</span>
          <span className="section-header__label">/ CONTACT</span>
        </div>
        <div className="contact__grid">
          <div className="contact__left">
            <h2 className="section-title">
              LET&apos;S
              <br />
              TALK<span className="dot">.</span>
            </h2>
            <p className="contact__description">
              Have a project in mind? Need an iOS app? Want a website that
              doesn&apos;t look like everything else? Reach out.
            </p>
          </div>
          <div className="contact__right">
            <div className="contact__socials">
              <a
                href="https://instagram.com/isolated.tech"
                target="_blank"
                rel="noopener"
                className="social-link"
              >
                <span className="social-link__platform">INSTAGRAM</span>
                <span className="social-link__handle">@isolated.tech</span>
                <span className="social-link__arrow">↗</span>
              </a>
              <a
                href="https://tiktok.com/@isolated.tech"
                target="_blank"
                rel="noopener"
                className="social-link"
              >
                <span className="social-link__platform">TIKTOK</span>
                <span className="social-link__handle">@isolated.tech</span>
                <span className="social-link__arrow">↗</span>
              </a>
              <a
                href="https://youtube.com/@codybontecou"
                target="_blank"
                rel="noopener"
                className="social-link"
              >
                <span className="social-link__platform">YOUTUBE</span>
                <span className="social-link__handle">@codybontecou</span>
                <span className="social-link__arrow">↗</span>
              </a>
              <a href="mailto:cody@isolated.tech" className="social-link">
                <span className="social-link__platform">EMAIL</span>
                <span className="social-link__handle">cody@isolated.tech</span>
                <span className="social-link__arrow">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
