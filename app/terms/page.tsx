import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for ISOLATED.TECH.",
};

export default function TermsPage() {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/">HOME</Link>
          <Link href="/apps">APPS</Link>
          <Link href="/privacy">PRIVACY</Link>
        </div>
      </nav>

      <main className="legal-page">
        <article className="legal-card">
          <p className="legal-eyebrow">LEGAL</p>
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-updated">Last updated: February 25, 2026</p>

          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your use of ISOLATED.TECH and related services operated by Isolated
              Tech ("we", "our", "us"). By accessing or using the service, you agree to these Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Eligibility and Accounts</h2>
            <ul>
              <li>You must be at least 13 years old to use the service.</li>
              <li>You are responsible for keeping account credentials and sign-in links secure.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You agree to provide accurate account information and keep it reasonably up to date.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Purchases and Payments</h2>
            <ul>
              <li>Certain apps or content are paid digital products, including pay-what-you-want pricing where offered.</li>
              <li>Payments are processed by third-party processors (including Stripe).</li>
              <li>You agree to pay all applicable charges, taxes, and fees associated with your purchase.</li>
              <li>Access to purchased apps is tied to your account and subject to these Terms.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Refunds</h2>
            <p>
              Because products are digital and may be delivered immediately, purchases are generally final unless otherwise
              required by law. If you believe there is an issue with a purchase, contact{" "}
              <a href="mailto:cody@isolated.tech">cody@isolated.tech</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. License and Acceptable Use</h2>
            <p>
              Unless explicitly stated otherwise, purchases grant you a personal, non-exclusive, non-transferable license to
              use the software for your own lawful use.
            </p>
            <p>You agree not to:</p>
            <ul>
              <li>resell, redistribute, sublicense, or commercially exploit software unless explicitly permitted;</li>
              <li>reverse engineer or attempt to extract source code where prohibited by applicable law;</li>
              <li>use the service in ways that violate laws, infringe rights, or harm other users or systems;</li>
              <li>attempt unauthorized access to any account, infrastructure, or data.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Reviews and User Content</h2>
            <p>
              If you submit reviews or other content, you grant us a worldwide, non-exclusive, royalty-free license to host,
              display, reproduce, and distribute that content in connection with operating and promoting the service.
            </p>
            <p>
              You are responsible for content you submit. We may remove content that is unlawful, abusive, misleading,
              infringing, or otherwise violates these Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Intellectual Property</h2>
            <p>
              The service, branding, design, and platform content are owned by Isolated Tech or its licensors and are
              protected by applicable intellectual property laws. These Terms do not transfer ownership rights to you.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Service Availability and Changes</h2>
            <p>
              We may modify, suspend, or discontinue any part of the service at any time. We may also change app listings,
              pricing, or features without prior notice, to the extent permitted by law.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate access to the service if you violate these Terms, engage in abuse/fraud,
              or create risk to the platform or other users. You may stop using the service at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Disclaimer of Warranties</h2>
            <p>
              The service and software are provided "as is" and "as available" without warranties of any kind, express or
              implied, including implied warranties of merchantability, fitness for a particular purpose, and
              non-infringement, to the maximum extent permitted by law.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Isolated Tech will not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of profits, data, goodwill, or business interruption,
              arising from or related to your use of the service.
            </p>
            <p>
              Our aggregate liability for claims related to the service will not exceed the amount you paid to us in the
              12 months preceding the claim.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Isolated Tech from claims, liabilities, damages, and expenses
              (including reasonable legal fees) arising from your misuse of the service or violation of these Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the jurisdiction in which Isolated Tech is established, without regard
              to conflict-of-law principles.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will post the revised Terms on this page and
              update the "Last updated" date.
            </p>
          </section>

          <section className="legal-section">
            <h2>15. Contact</h2>
            <p>
              Questions about these Terms can be sent to <a href="mailto:cody@isolated.tech">cody@isolated.tech</a>.
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
