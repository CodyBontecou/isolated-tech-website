import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for ISOLATED.TECH.",
};

export default function PrivacyPage() {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/">HOME</Link>
          <Link href="/apps">APPS</Link>
          <Link href="/terms">TERMS</Link>
        </div>
      </nav>

      <main className="legal-page">
        <article className="legal-card">
          <p className="legal-eyebrow">LEGAL</p>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-updated">Last updated: February 25, 2026</p>

          <section className="legal-section">
            <h2>1. Who We Are</h2>
            <p>
              Isolated Tech operates ISOLATED.TECH, an app storefront and account platform for downloading and
              managing software products.
            </p>
            <p>
              If you have questions about this policy, contact us at <a href="mailto:cody@isolated.tech">cody@isolated.tech</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>We collect information you provide directly and information collected automatically when you use the service.</p>
            <ul>
              <li>
                <strong>Account information:</strong> email address, name, avatar (if provided), and linked OAuth account identifiers.
              </li>
              <li>
                <strong>Authentication data:</strong> session identifiers, login metadata, and one-time magic-link login tokens.
              </li>
              <li>
                <strong>Transaction data:</strong> purchased app, amount paid, currency, timestamp, and payment-related IDs from Stripe.
              </li>
              <li>
                <strong>Preferences:</strong> newsletter subscription preference and account settings.
              </li>
              <li>
                <strong>User submissions:</strong> app reviews and ratings that you choose to submit.
              </li>
              <li>
                <strong>Operational logs:</strong> basic event logs for security, fraud prevention, and troubleshooting.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Information</h2>
            <ul>
              <li>Provide, operate, and maintain the platform and user accounts.</li>
              <li>Authenticate users and secure sessions.</li>
              <li>Process purchases and deliver software access.</li>
              <li>Send transactional communications (for example receipts, account/login messages, and service updates).</li>
              <li>Send product updates or newsletters when you are subscribed.</li>
              <li>Prevent abuse, detect fraud, and protect service integrity.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Payment Processing</h2>
            <p>
              Payments are processed by Stripe. We do not store full payment card numbers. Stripe processes payment data in
              accordance with Stripe&apos;s own privacy terms and security standards.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Sharing of Information</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul>
              <li><strong>Infrastructure and hosting providers</strong> (for example Cloudflare services).</li>
              <li><strong>Payment processor</strong> (Stripe) for checkout and payment confirmation.</li>
              <li><strong>Email delivery providers</strong> (for transactional and optional broadcast emails).</li>
              <li><strong>Authentication providers</strong> (such as Apple, Google, and GitHub) when you choose OAuth sign-in.</li>
              <li><strong>Legal authorities</strong> when required by law or to protect rights and safety.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Cookies and Similar Technologies</h2>
            <p>
              We use essential cookies and similar storage mechanisms to keep you signed in, maintain secure sessions,
              and support core functionality. These are required for account and purchase features to work correctly.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Data Retention</h2>
            <p>
              We retain information for as long as needed to provide the service, maintain records, resolve disputes,
              and comply with legal obligations. Certain transaction or audit records may be retained after account closure
              where required for security, legal, accounting, or tax purposes.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Account Deletion</h2>
            <p>
              You may request account deletion through your account features or by contacting us. When an account is deleted,
              active sessions are invalidated and account-linked personal data is removed or anonymized, except where we must
              retain limited records for legal, accounting, fraud-prevention, or security reasons.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Security</h2>
            <p>
              We use reasonable technical and organizational safeguards designed to protect your information. No system can be
              guaranteed perfectly secure, but we continuously work to reduce risk and improve protections.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be processed in countries other than your own, depending on where our providers operate.
              By using the service, you acknowledge that your information may be transferred and processed across borders.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Your Rights and Choices</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul>
              <li>access personal data we hold about you;</li>
              <li>request correction of inaccurate data;</li>
              <li>request deletion of your data (subject to legal exceptions);</li>
              <li>opt out of non-essential marketing emails.</li>
            </ul>
            <p>
              To exercise these rights, contact us at <a href="mailto:cody@isolated.tech">cody@isolated.tech</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Children&apos;s Privacy</h2>
            <p>
              Our service is not directed to children under 13, and we do not knowingly collect personal information from
              children under 13. If you believe a child has provided personal information, contact us and we will take
              appropriate steps.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated version on this page and revise
              the "Last updated" date.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Contact</h2>
            <p>
              Questions or requests about this Privacy Policy can be sent to{" "}
              <a href="mailto:cody@isolated.tech">cody@isolated.tech</a>.
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
