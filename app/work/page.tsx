import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { CLIENT_WORK, CLIENT_WORK_STATS } from "@/lib/client-work";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Client Work — ISOLATED.TECH",
  description:
    "Selected websites designed and built for clients by ISOLATED.TECH. Positioning-first design, fast builds, and conversion-aware execution.",
};

export default async function WorkPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <SiteNav user={user} activePage="work" />

      <section className="work-hero">
        <div className="work-hero__inner">
          <p className="work-hero__label">CLIENT WORK</p>
          <h1 className="work-hero__title">Websites that look sharp and convert.</h1>
          <p className="work-hero__subtitle">
            I build high-quality websites for local businesses and founder-led brands —
            with clear messaging, polished design, and practical conversion flow.
          </p>
          <div className="work-hero__actions">
            <Link href="/hire" className="work-btn work-btn--primary">
              BOOK INTRO CALL
            </Link>
            <a href="mailto:cody@isolated.tech" className="work-btn work-btn--ghost">
              EMAIL DIRECT
            </a>
          </div>
        </div>
        <div className="work-hero__stats" aria-label="Studio stats">
          <div className="work-hero__stat">
            <span className="work-hero__stat-number">{CLIENT_WORK_STATS.projectsCompleted}</span>
            <span className="work-hero__stat-label">RECENT PROJECTS</span>
          </div>
          <div className="work-hero__stat">
            <span className="work-hero__stat-number">{CLIENT_WORK_STATS.industries}</span>
            <span className="work-hero__stat-label">INDUSTRIES</span>
          </div>
          <div className="work-hero__stat">
            <span className="work-hero__stat-number">{CLIENT_WORK_STATS.deliveryModel}</span>
            <span className="work-hero__stat-label">DELIVERY MODEL</span>
          </div>
        </div>
      </section>

      <section className="work-grid" aria-label="Client case studies">
        {CLIENT_WORK.map((project) => (
          <article key={project.slug} className="work-card">
            <div className="work-card__media">
              <img src={project.previewImage} alt={`${project.client} website preview`} />
            </div>

            <div className="work-card__body">
              <p className="work-card__client">{project.client}</p>
              <h2 className="work-card__headline">{project.headline}</h2>
              <p className="work-card__summary">{project.summary}</p>

              {(project.before && project.after) && (
                <div className="work-compare">
                  <a href={project.before.url} target="_blank" rel="noopener" className="work-compare__item">
                    <img src={project.before.previewImage} alt={`${project.client} before redesign`} />
                    <span>{project.before.label}</span>
                  </a>
                  <a href={project.after.url} target="_blank" rel="noopener" className="work-compare__item">
                    <img src={project.after.previewImage} alt={`${project.client} after redesign`} />
                    <span>{project.after.label}</span>
                  </a>
                </div>
              )}

              <div className="work-card__meta">
                <div>
                  <h3>Services</h3>
                  <p>{project.services.join(" · ")}</p>
                </div>
                <div>
                  <h3>Stack</h3>
                  <p>{project.stack.join(" · ")}</p>
                </div>
              </div>

              <ul className="work-card__outcomes">
                {project.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>

              <a href={project.primaryUrl} target="_blank" rel="noopener" className="work-card__link">
                View live site <span>↗</span>
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="work-cta">
        <p className="work-cta__label">HIRING</p>
        <h2 className="work-cta__title">Need a website like this for your business?</h2>
        <p className="work-cta__text">
          I take on a limited number of client projects at a time. If you want modern design,
          fast execution, and a reliable build partner — with a free build and $200/month unlimited edits — let&apos;s talk.
        </p>
        <div className="work-cta__actions">
          <Link href="/hire" className="work-btn work-btn--primary">START A PROJECT</Link>
          <a href="mailto:cody@isolated.tech" className="work-btn work-btn--ghost">cody@isolated.tech</a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
