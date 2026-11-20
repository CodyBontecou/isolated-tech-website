import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./guide.css";

const title = "Pre-Formation Business Expenses in Hawaii";
const description =
  "How to deduct costs from before you formed your business, on the federal and Hawaii returns, with official links.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides/pre-formation-expenses-hawaii" },
  openGraph: { title, description, url: "/guides/pre-formation-expenses-hawaii" },
  twitter: { title, description },
};

type Link = { href: string; label: string; note?: string };

const FEDERAL_LINKS: Link[] = [
  { href: "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040", label: "Schedule C (Form 1040)" },
  { href: "https://www.irs.gov/forms-pubs/about-form-4562", label: "Form 4562 and instructions" },
  { href: "https://www.irs.gov/publications/p334", label: "Pub 334", note: "Tax Guide for Small Business" },
  { href: "https://www.irs.gov/publications/p946", label: "Pub 946", note: "How to Depreciate Property" },
  { href: "https://www.irs.gov/publications/p583", label: "Pub 583", note: "Starting a Business and Keeping Records" },
];

const HAWAII_LINKS: Link[] = [
  { href: "https://hitax.hawaii.gov", label: "Hawaii Tax Online" },
  { href: "https://tax.hawaii.gov/forms/", label: "Tax forms" },
  { href: "https://tax.hawaii.gov/geninfo/get/", label: "GET information" },
  { href: "https://tax.hawaii.gov/geninfo/a1_b1_1licensing/", label: "Licensing information" },
  { href: "https://hbe.ehawaii.gov", label: "Hawaii Business Express" },
];

const SOURCES: Link[] = [
  { href: "https://files.hawaii.gov/tax/forms/current/n30ins.pdf", label: "N-30 instructions (current)" },
  { href: "https://files.hawaii.gov/tax/forms/2024/n30ins.pdf", label: "N-30 instructions (2024)" },
  { href: "https://pro.bloombergtax.com/insights/federal-tax/state-conformity-to-federal-bonus-depreciation/", label: "Bloomberg Tax: bonus depreciation conformity" },
  { href: "https://data.capitol.hawaii.gov/sessions/sessionlaws/Years/SLH2015/SLH2015_Act52.pdf", label: "SLH 2015 Act 52" },
  { href: "https://tax.hawaii.gov/?p=11762", label: "DoTax: Licensing Information" },
  { href: "https://tax.hawaii.gov/?p=7651", label: "DoTax: GET Information" },
  { href: "https://files.hawaii.gov/tax/forms/2024/bb1_i.pdf", label: "Form BB-1 instructions" },
  { href: "https://files.hawaii.gov/tax/legal/taxfacts/tf2025-31-1.pdf", label: "Tax Facts 2025-31-1" },
  { href: "https://webarchive.library.unt.edu/web/20120916194440/http://www.irs.gov/publications/p535/ch08.html", label: "IRS Pub 535 ch. 8 (archived)" },
  { href: "https://extension.usu.edu/ruraltax/tax-topics/start-up-costs-2024", label: "USU Rural Tax: Start-Up Costs 2024" },
  { href: "https://taxact.com/support/14589/schedule-c-amortization-business-start-up-costs", label: "TaxAct: startup cost amortization" },
  { href: "https://www.journalofaccountancy.com/issues/2008/oct/startup-expensingelectionnowdeemed/", label: "Journal of Accountancy: election deemed" },
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function LinkList({ links }: { links: Link[] }) {
  return (
    <ul className="pfx-links">
      {links.map((l) => (
        <li key={l.href}>
          <Ext href={l.href}>{l.label}</Ext>
          {l.note ? <span className="pfx-lbl"> {l.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Form({ children }: { children: ReactNode }) {
  return <span className="pfx-form">{children}</span>;
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <li className="pfx-step">
      <span className="pfx-n">{n}</span>
      <h3>{title}</h3>
      <div className="pfx-step-body">{children}</div>
    </li>
  );
}

export default function PreFormationExpensesHawaiiPage() {
  return (
    <div className="pfx">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
        precedence="default"
      />

      <header className="pfx-bar">
        <div className="pfx-wrap">
          <a className="pfx-name" href="/">ISOLATED.TECH</a>
          <span className="pfx-tag">Federal + Hawaii · Nov 2026</span>
        </div>
      </header>

      <main>
        <section className="pfx-hero">
          <div className="pfx-wrap">
            <h1>Deduct costs from before you formed your business</h1>
            <p className="pfx-sub">
              The date you formed the LLC does not control the deduction. The date the business started controls it.
            </p>
            <div className="pfx-actions">
              <a className="pfx-btn pfx-primary" href="#steps">Go to the steps</a>
              <span className="pfx-btn pfx-ghost"><span className="pfx-dim">§</span> IRC 195 · HRS 235-2.4</span>
            </div>
          </div>
        </section>

        <div className="pfx-wrap">
          <section className="pfx-cols" aria-label="Key figures">
            <div className="pfx-col">
              <span className="pfx-k">federal</span>
              <div className="pfx-v">$5,000</div>
              <p className="pfx-d">Maximum startup costs you can deduct in the first year.</p>
            </div>
            <div className="pfx-col">
              <span className="pfx-k">federal</span>
              <div className="pfx-v">180 mo.</div>
              <p className="pfx-d">Time period to deduct the remaining startup costs.</p>
            </div>
            <div className="pfx-col">
              <span className="pfx-k">hawaii</span>
              <div className="pfx-v">$25,000</div>
              <p className="pfx-d">Maximum Section 179 deduction. No bonus depreciation.</p>
            </div>
            <div className="pfx-col pfx-statement">
              <p>
                Did you sell before you formed the LLC? Then you were a sole proprietor for that time, and those costs
                are ordinary deductions. Hawaii uses the federal rules, with two exceptions: depreciation and General
                Excise Tax.
              </p>
            </div>
          </section>

          <div className="pfx-sec-head" id="steps">
            <h2>Seven steps, in order</h2>
            <span className="pfx-k">procedure</span>
          </div>

          <ol className="pfx-steps">
            <Step n="01" title="Find your business start date">
              <ul>
                <li>Find the date you first offered a product or service. Examples: your first sale, listing or client pitch.</li>
                <li>Write down the date and the reason for it.</li>
                <li>A cost before this date is a startup cost or an asset.</li>
                <li>A cost after this date is an ordinary expense.</li>
                <li>The IRS does not tax a single-member LLC as a separate entity. Put all costs for the full year on one Schedule C.</li>
              </ul>
            </Step>

            <Step n="02" title="Put each cost in one of four groups">
              <p>Make a spreadsheet with these columns: date, vendor, amount, purpose, group and receipt link.</p>
              <div className="pfx-table-scroll">
                <table>
                  <thead>
                    <tr><th>group</th><th>examples</th><th>tax treatment</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Startup costs</td><td>Market research, advertising before launch, training, travel to find suppliers</td><td>Deduct a maximum of $5,000. Deduct the remainder over 180 months.</td></tr>
                    <tr><td>Organizational costs</td><td>LLC filing fee, legal fees for the operating agreement</td><td>Same $5,000 and 180-month rules. Record them separately.</td></tr>
                    <tr><td>Equipment</td><td>Computer, camera, phone</td><td>Depreciate from the date the business starts to use it.</td></tr>
                    <tr><td>Ordinary expenses</td><td>Software, supplies, advertising after launch</td><td>Deduct the full amount in the year you pay it.</td></tr>
                  </tbody>
                </table>
              </div>
              <ul>
                <li>Are your total startup costs more than $50,000? Then subtract the excess from the $5,000.</li>
                <li>Did you use the equipment personally first? Then use the lower value: the price you paid, or the fair market value on the date the business started to use it.</li>
              </ul>
            </Step>

            <Step n="03" title="Complete the federal return">
              <ul>
                <li><b>Sole proprietor or single-member LLC:</b> Complete <Form>Schedule C</Form>. Attach it to <Form>Form 1040</Form>.</li>
                <li><b>Startup costs, organizational costs and equipment:</b> Complete <Form>Form 4562</Form>. Put the startup costs in Part VI (amortization). Attach a short statement.</li>
                <li><b>The $5,000 election:</b> The IRS applies it automatically. You can choose not to use it. You cannot change an amortization election after you make it.</li>
                <li><b>Multi-member LLC</b> (<Form>1065</Form>) <b>or corporation</b> (<Form>1120</Form> or <Form>1120-S</Form>): The entity makes the elections. Did you pay costs before the entity existed? Then the entity pays you back, or records the costs as your capital contribution.</li>
              </ul>
              <LinkList links={FEDERAL_LINKS} />
              <p className="pfx-fine">The IRS no longer publishes Pub 535. Use Pub 334 and the Form 4562 instructions for startup costs.</p>
            </Step>

            <Step n="04" title="Complete the Hawaii income tax return">
              <ul>
                <li><b>Residents:</b> Put your Schedule C amounts on <Form>N-11</Form>.</li>
                <li><b>Other entities:</b> Partnerships use <Form>N-20</Form>. S corporations use <Form>N-35</Form>. C corporations use <Form>N-30</Form>.</li>
                <li><b>Startup costs:</b> Use the federal amounts. Hawaii uses the same rules.</li>
              </ul>
              <div className="pfx-callout">
                <span className="pfx-k">hawaii depreciation is different</span>
                <ul>
                  <li><b>Bonus depreciation:</b> Hawaii does not permit it (HRS §235-2.4). Add back all federal bonus depreciation on the Hawaii return.</li>
                  <li><b>Section 179:</b> The Hawaii maximum is $25,000. Depreciate any amount above $25,000 with regular depreciation.</li>
                  <li><b>Records:</b> Keep a separate Hawaii depreciation schedule for each asset. The Hawaii basis will be different from the federal basis.</li>
                </ul>
              </div>
              <LinkList
                links={[
                  { href: "https://tax.hawaii.gov/forms/", label: "Hawaii tax forms", note: "Select the year. Then select N-11 and its instructions." },
                  { href: "https://files.hawaii.gov/tax/forms/current/n30ins.pdf", label: "N-30 instructions (current)", note: "Shows the $25,000 limit and the bonus depreciation rule" },
                ]}
              />
            </Step>

            <Step n="05" title="Register for Hawaii General Excise Tax">
              <p>
                GET is a tax on gross receipts. The rate is approximately 4% to 4.5%. The rate changes by county.
                Business costs do not decrease GET. You must pay GET on all revenue, also when you have no taxable income.
              </p>
              <ul>
                <li>Go to <Ext href="https://hitax.hawaii.gov">Hawaii Tax Online</Ext>.</li>
                <li>Select Registration, then Register New Business License, then Form <Form>BB-1</Form>.</li>
                <li>Select the GET/Use tax option.</li>
                <li>Pay the $20 fee. You pay it one time only.</li>
                <li>Wait for your Hawaii Tax ID. Online: 5 to 7 days. By mail: 4 to 6 weeks.</li>
                <li>Select a filing period: monthly, quarterly or semiannual.</li>
                <li>Submit a <Form>G-45</Form> for each period. Submit a <Form>G-49</Form> each year.</li>
              </ul>
              <div className="pfx-callout">
                <span className="pfx-k">sales before your license</span>
                <p>You must pay GET on that revenue. Speak to a CPA about the past periods. Penalties increase with time.</p>
              </div>
              <LinkList
                links={[
                  { href: "https://tax.hawaii.gov/geninfo/get/", label: "GET information" },
                  { href: "https://tax.hawaii.gov/geninfo/a1_b1_1licensing/", label: "Licensing information" },
                ]}
              />
            </Step>

            <Step n="06" title="File the LLC annual report">
              <p>
                Did you form an LLC with the Hawaii DCCA? Then file its annual report on time at{" "}
                <Ext href="https://hbe.ehawaii.gov">Hawaii Business Express</Ext>.
              </p>
            </Step>

            <Step n="07" title="Keep your records">
              <ul>
                <li>Keep receipts, the spreadsheet and the start date note for a minimum of <b>3 years after you file</b>.</li>
                <li>For depreciated or amortized assets, keep the records until <b>3 years after the last year you deduct them</b>.</li>
                <li>For 180-month amortization, this is approximately 18 years.</li>
              </ul>
            </Step>
          </ol>

          <section className="pfx-cta">
            <div>
              <h2>Use a CPA in Hawaii</h2>
              <ul>
                <li>You have more than a few thousand dollars of equipment.</li>
                <li>You have an S corporation or a multi-member LLC.</li>
                <li>You made sales before you got a GET license.</li>
                <li>You are not sure of your start date.</li>
              </ul>
              <p>
                National tax chains often do not apply the Hawaii depreciation rules. The Hawaii rules on this page come
                from older instructions. Make sure they are correct in the current N-11 instructions.
              </p>
            </div>
            <div className="pfx-actions">
              <a className="pfx-btn pfx-primary" href="https://tax.hawaii.gov/forms/" target="_blank" rel="noopener noreferrer">Hawaii forms</a>
              <a className="pfx-btn pfx-ghost" href="https://www.irs.gov/forms-pubs/about-form-4562" target="_blank" rel="noopener noreferrer">
                <span className="pfx-dim">$</span> form 4562
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="pfx-wrap">
          <div className="pfx-foot-grid">
            {[
              { heading: "Federal", links: FEDERAL_LINKS },
              { heading: "Hawaii", links: HAWAII_LINKS },
              { heading: "Sources", links: SOURCES },
            ].map((group) => (
              <div key={group.heading}>
                <h4>{group.heading}</h4>
                <ul>
                  {group.links.map((l) => (
                    <li key={l.href}>
                      <Ext href={l.href}>{l.label}</Ext>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="pfx-foot-note">General US and Hawaii information as of November 2026. Not tax advice.</p>
        </div>
      </footer>
    </div>
  );
}
