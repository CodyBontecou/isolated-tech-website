import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Hire — ISOLATED.TECH",
  description:
    "Hire ISOLATED.TECH for client websites and product-style web experiences. Discovery, design, build, and launch.",
};

const PROCESS = [
  {
    title: "Discovery",
    body: "We align on goals, customer profile, offer structure, and what the website needs to do for your business."
  },
  {
    title: "Direction",
    body: "I design a clear visual and messaging direction so the site feels premium and instantly understandable."
  },
  {
    title: "Build",
    body: "You get a fast, responsive implementation with thoughtful details and conversion-focused structure."
  },
  {
    title: "Launch",
    body: "Deployment, QA, and handoff — including clear next steps for edits, updates, and growth."
  }
];

export default async function HirePage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <SiteNav user={user} activePage="hire" />

      <section className="hire-hero">
        <p className="hire-hero__label">CLIENT SERVICES</p>
        <h1 className="hire-hero__title">Design and development for modern business websites.</h1>
        <p className="hire-hero__subtitle">
          Best fit for local businesses, personal brands, and product teams who want
          premium design quality without slow agency timelines.
          <br />
          Pricing is simple: your site is free, then it&apos;s $200/month with unlimited edits.
        </p>
        <div className="hire-hero__actions">
          <a href="mailto:cody@isolated.tech?subject=Website%20Project%20Inquiry" className="work-btn work-btn--primary">
            BOOK INTRO CALL
          </a>
          <Link href="/work" className="work-btn work-btn--ghost">
            VIEW CLIENT WORK
          </Link>
        </div>
      </section>

      <section className="hire-section">
        <div className="hire-section__panel">
          <p className="hire-section__label">ENGAGEMENTS</p>
          <h2>What I build</h2>
          <ul>
            <li>Marketing websites for local service businesses</li>
            <li>Landing pages for SaaS and app launches</li>
            <li>Personal brand sites and creator portfolios</li>
            <li>Conversion-focused redesigns of existing websites</li>
          </ul>
        </div>

        <div className="hire-section__panel">
          <p className="hire-section__label">PRICING</p>
          <h2>Simple monthly model</h2>
          <ul>
            <li><strong>Website build:</strong> $0 upfront</li>
            <li><strong>Ongoing plan:</strong> $200/month</li>
            <li><strong>Edits:</strong> unlimited requests included</li>
            <li><strong>Best for:</strong> businesses that want a site that keeps improving</li>
          </ul>
          <p className="hire-section__note">
            One flat model: launch free, then stay on the monthly plan for continuous updates.
          </p>
        </div>
      </section>

      <section className="hire-process" aria-label="Project process">
        <p className="hire-process__label">PROCESS</p>
        <div className="hire-process__grid">
          {PROCESS.map((step, index) => (
            <article key={step.title} className="hire-process__card">
              <span className="hire-process__index">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="work-cta">
        <p className="work-cta__label">START</p>
        <h2 className="work-cta__title">Tell me what you&apos;re building.</h2>
        <p className="work-cta__text">
          Send your current site (if you have one), goals, and rough timeline.
          I&apos;ll reply with next steps and availability.
        </p>
        <div className="work-cta__actions">
          <a href="mailto:cody@isolated.tech?subject=Website%20Project%20Inquiry" className="work-btn work-btn--primary">
            CONTACT CODY
          </a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
