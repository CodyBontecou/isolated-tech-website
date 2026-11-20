import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Customer #1",
  description:
    "Subscribe as customer #1, lock in a founding price, and get the app you need built with you. Open source under AGPL-3.0.",
};

const INQUIRY_HREF = "mailto:cody@isolated.tech?subject=Customer%20%231%20Inquiry";

const PROCESS = [
  {
    title: "Scope",
    body: "Tell me about the app you wish existed. We agree on a first version and a rough timeline.",
  },
  {
    title: "Subscribe",
    body: "Start a small monthly subscription. That locks in your founding price.",
  },
  {
    title: "Build",
    body: "I build what you need in short loops with you, shipping early and often. AI keeps the timeline short.",
  },
  {
    title: "Grow",
    body: "The product opens up to customers #2, #3 and beyond. You keep your founding price.",
  },
];

export default async function HirePage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <SiteNav user={user} activePage="hire" />

      <section className="hire-hero">
        <p className="hire-hero__label">CUSTOMER #1</p>
        <h1 className="hire-hero__title">Fund the app you want. Lock in the price.</h1>
        <p className="hire-hero__subtitle">
          Subscribe as customer #1 for a small monthly amount, from $200/month, and I&apos;ll build the
          product you need. Your founding price stays locked. I keep ownership, so the product can grow to
          serve the customers who come after you. Everything is open source under AGPL-3.0.
        </p>
        <div className="hire-hero__actions">
          <a href={INQUIRY_HREF} className="work-btn work-btn--primary">
            BECOME CUSTOMER #1
          </a>
          <Link href="/apps" className="work-btn work-btn--ghost">
            SEE WHAT I&apos;VE SHIPPED
          </Link>
        </div>
      </section>

      <section className="hire-section">
        <div className="hire-section__panel">
          <p className="hire-section__label">WHAT YOU GET</p>
          <h2>Your product, built with you</h2>
          <ul>
            <li>An app shaped around what you need, with you setting the priorities</li>
            <li>Close collaboration and fast iterations</li>
            <li>A founding price, locked in for as long as you use the product</li>
            <li>Stop subscribing whenever you like. No long contract</li>
          </ul>
        </div>

        <div className="hire-section__panel">
          <p className="hire-section__label">THE TERMS</p>
          <h2>Plain and simple</h2>
          <ul>
            <li><strong>Price:</strong> from $200/month, agreed up front and locked in</li>
            <li><strong>Ownership:</strong> I own the product, its brand and its direction</li>
            <li><strong>Code:</strong> open source under AGPL-3.0, public from day one</li>
            <li><strong>If I stop:</strong> the code is yours to take and run</li>
          </ul>
          <p className="hire-section__note">
            The locked price holds while the product stays sustainable to run. Others can use the code
            too, under the same AGPL terms.
          </p>
        </div>
      </section>

      <section className="hire-process" aria-label="How it works">
        <p className="hire-process__label">HOW IT WORKS</p>
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
        <h2 className="work-cta__title">Have an app you wish existed?</h2>
        <p className="work-cta__text">
          Tell me what it should do, who it&apos;s for and when you need it. I&apos;ll reply with whether
          it&apos;s a fit and a first plan.
        </p>
        <div className="work-cta__actions">
          <a href={INQUIRY_HREF} className="work-btn work-btn--primary">
            CONTACT CODY
          </a>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
