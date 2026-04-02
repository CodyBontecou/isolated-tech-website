/**
 * web.isolated.tech — Client Web Services
 *
 * A focused sales site for potential web clients.
 * Served as a self-contained HTML/CSS/JS response.
 */

interface Env {}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WEB — ISOLATED.TECH</title>
  <meta name="description" content="We design and build premium websites for local businesses, founders, and brands. Your site launches free. Then $200/month, unlimited edits." />
  <meta property="og:title" content="WEB — ISOLATED.TECH" />
  <meta property="og:description" content="We design and build premium websites for local businesses, founders, and brands. Free to build. $200/month." />
  <meta property="og:url" content="https://web.isolated.tech" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="https://web.isolated.tech" />
  <link rel="icon" href="https://isolated.tech/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />

  <style>
    /* ─── Reset ─── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    button, input, select, textarea { font: inherit; }
    button, a { -webkit-tap-highlight-color: transparent; }
    :focus-visible { outline: 2px solid #C55C30; outline-offset: 3px; }

    /* ─── Tokens ─── */
    :root {
      --cream:    #F6F2EC;
      --ink:      #16110C;
      --muted:    #7B7166;
      --faint:    #E5DDD2;
      --border:   #D4C9B8;
      --white:    #FFFFFF;
      --accent:   #C55C30;
      --accent-2: #8B3E1E;

      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono:    'DM Mono', 'Courier New', monospace;

      --max: 1120px;
      --pad: clamp(1.25rem, 5vw, 3rem);
    }

    /* ─── Base ─── */
    html {
      font-size: 16px;
      scroll-behavior: smooth;
      -webkit-text-size-adjust: 100%;
    }
    body {
      font-family: var(--font-mono);
      background: var(--cream);
      color: var(--ink);
      overflow-x: hidden;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── Utility ─── */
    .u-container {
      max-width: var(--max);
      margin: 0 auto;
      padding: 0 var(--pad);
    }
    .u-label {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .u-divider {
      border: none;
      border-top: 1px solid var(--border);
    }

    /* ─── Top stripe ─── */
    .top-stripe {
      height: 3px;
      background: var(--accent);
    }

    /* ─── Nav ─── */
    .nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(246, 242, 236, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .nav__inner {
      max-width: var(--max);
      margin: 0 auto;
      padding: 0 var(--pad);
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav__logo {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink);
    }
    .nav__logo span {
      color: var(--accent);
    }
    .nav__links {
      display: flex;
      align-items: center;
      gap: 2rem;
    }
    .nav__links a {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color 0.15s;
    }
    .nav__links a:hover { color: var(--ink); }
    .nav__cta {
      display: inline-flex;
      align-items: center;
      height: 34px;
      padding: 0 1.125rem;
      background: var(--ink);
      color: var(--cream) !important;
      border-radius: 2px;
      font-size: 0.6875rem !important;
      letter-spacing: 0.14em !important;
      transition: background 0.15s !important;
    }
    .nav__cta:hover { background: var(--accent) !important; color: var(--white) !important; }

    /* ─── Hero ─── */
    .hero {
      padding: clamp(4rem, 10vw, 7rem) var(--pad) clamp(3.5rem, 8vw, 5.5rem);
      max-width: var(--max);
      margin: 0 auto;
    }
    .hero__kicker {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .hero__kicker::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
      max-width: 6rem;
    }
    .hero__headline {
      font-family: var(--font-display);
      font-size: clamp(3rem, 7.5vw, 6.25rem);
      font-weight: 300;
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--ink);
      max-width: 14ch;
      margin-bottom: 1.75rem;
    }
    .hero__headline em {
      font-style: italic;
      color: var(--accent);
    }
    .hero__sub {
      font-family: var(--font-mono);
      font-size: clamp(0.875rem, 1.5vw, 1rem);
      line-height: 1.7;
      color: var(--muted);
      max-width: 52ch;
      margin-bottom: 2.5rem;
    }
    .hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.875rem;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      height: 48px;
      padding: 0 1.75rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      border: none;
      cursor: pointer;
      transition: all 0.18s;
      border-radius: 2px;
    }
    .btn--primary {
      background: var(--ink);
      color: var(--cream);
    }
    .btn--primary:hover {
      background: var(--accent);
      color: var(--white);
    }
    .btn--outline {
      background: transparent;
      color: var(--ink);
      border: 1px solid var(--border);
    }
    .btn--outline:hover {
      border-color: var(--ink);
    }

    /* ─── Stats bar ─── */
    .stats {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--white);
    }
    .stats__inner {
      max-width: var(--max);
      margin: 0 auto;
      padding: 0 var(--pad);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
    }
    .stats__item {
      padding: 2rem 0;
      text-align: center;
    }
    .stats__item:not(:last-child) {
      border-right: 1px solid var(--border);
    }
    .stats__number {
      display: block;
      font-family: var(--font-display);
      font-size: clamp(2.25rem, 5vw, 3.5rem);
      font-weight: 300;
      line-height: 1;
      color: var(--ink);
      margin-bottom: 0.5rem;
    }
    .stats__label {
      font-family: var(--font-mono);
      font-size: 0.625rem;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
    }

    /* ─── Section headings ─── */
    .section-head {
      max-width: var(--max);
      margin: 0 auto;
      padding: clamp(3.5rem, 8vw, 5.5rem) var(--pad) clamp(2rem, 4vw, 3rem);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-head__title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 300;
      line-height: 1.1;
      letter-spacing: -0.015em;
      color: var(--ink);
      max-width: 20ch;
    }
    .section-head__title em { font-style: italic; color: var(--accent); }

    /* ─── Portfolio ─── */
    .portfolio {
      background: var(--white);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding-bottom: clamp(3rem, 7vw, 5rem);
    }
    .portfolio__grid {
      max-width: var(--max);
      margin: 0 auto;
      padding: 0 var(--pad);
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .portfolio-card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-top: 1px solid var(--border);
      padding: clamp(2rem, 5vw, 3.5rem) 0;
      gap: clamp(2rem, 5vw, 4rem);
      align-items: start;
    }
    .portfolio-card:first-child { border-top: none; }
    .portfolio-card__media {
      position: relative;
      overflow: hidden;
      border-radius: 4px;
      background: var(--faint);
      aspect-ratio: 16 / 10;
    }
    .portfolio-card__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      transition: transform 0.5s ease;
    }
    .portfolio-card__media:hover img {
      transform: scale(1.03);
    }
    .portfolio-card__body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-top: 0.5rem;
    }
    .portfolio-card__client {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .portfolio-card__headline {
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 3vw, 2.25rem);
      font-weight: 400;
      line-height: 1.2;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .portfolio-card__summary {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.75;
      color: var(--muted);
    }
    .portfolio-card__meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 0;
      border-top: 1px solid var(--border);
    }
    .portfolio-card__meta-row {
      display: flex;
      gap: 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
    }
    .portfolio-card__meta-label {
      color: var(--muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      min-width: 5rem;
    }
    .portfolio-card__meta-value { color: var(--ink); }
    .portfolio-card__outcomes {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .portfolio-card__outcomes li {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--muted);
      padding-left: 1.125rem;
      position: relative;
      line-height: 1.5;
    }
    .portfolio-card__outcomes li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--accent);
      font-size: 0.75rem;
    }
    .portfolio-card__compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .compare-item {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      border-radius: 3px;
      overflow: hidden;
    }
    .compare-item img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      object-position: top;
      border: 1px solid var(--border);
      border-radius: 3px;
      transition: opacity 0.2s;
    }
    .compare-item:hover img { opacity: 0.85; }
    .compare-item__label {
      font-family: var(--font-mono);
      font-size: 0.625rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .portfolio-card__link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent);
      transition: gap 0.2s;
    }
    .portfolio-card__link:hover { gap: 0.625rem; }

    /* ─── Services ─── */
    .services {
      padding: clamp(3.5rem, 8vw, 5.5rem) var(--pad);
      max-width: var(--max);
      margin: 0 auto;
    }
    .services__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-top: clamp(2rem, 4vw, 3rem);
    }
    .service-item {
      padding: clamp(1.5rem, 3vw, 2.25rem);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--white);
    }
    .service-item:nth-child(even) { border-right: none; }
    .service-item:nth-last-child(-n+2) { border-bottom: none; }
    .service-item__num {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 300;
      color: var(--faint);
      line-height: 1;
      margin-bottom: 1rem;
    }
    .service-item__title {
      font-family: var(--font-display);
      font-size: 1.375rem;
      font-weight: 400;
      color: var(--ink);
      margin-bottom: 0.625rem;
      letter-spacing: -0.01em;
    }
    .service-item__desc {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.7;
      color: var(--muted);
    }

    /* ─── Pricing ─── */
    .pricing {
      background: var(--ink);
      color: var(--cream);
      padding: clamp(3.5rem, 8vw, 5.5rem) var(--pad);
    }
    .pricing__inner {
      max-width: var(--max);
      margin: 0 auto;
    }
    .pricing__label { color: var(--accent); }
    .pricing__title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 300;
      line-height: 1.1;
      letter-spacing: -0.015em;
      color: var(--cream);
      max-width: 22ch;
      margin: 1rem 0 2.5rem;
    }
    .pricing__title em { font-style: italic; color: var(--accent); }
    .pricing__tiers {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      align-items: stretch;
    }
    .pricing__card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 4px;
      padding: clamp(1.75rem, 3.5vw, 2.5rem);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .pricing__card--bespoke {
      background: transparent;
      border: 1px solid var(--accent);
      position: relative;
    }
    .pricing__card--bespoke::before {
      content: 'CUSTOM';
      position: absolute;
      top: -0.6rem;
      left: 1.5rem;
      background: var(--ink);
      padding: 0 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.5625rem;
      font-weight: 500;
      letter-spacing: 0.2em;
      color: var(--accent);
    }
    .pricing__card-head {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .pricing__card--bespoke .pricing__card-head {
      border-bottom-color: rgba(197,92,48,0.25);
    }
    .pricing__main-price {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .price-amount {
      font-family: var(--font-display);
      font-size: clamp(3rem, 6vw, 4.75rem);
      font-weight: 300;
      line-height: 1;
      color: var(--cream);
    }
    .price-amount sup {
      font-size: 0.35em;
      vertical-align: top;
      margin-top: 0.3em;
    }
    .price-amount--custom {
      font-size: clamp(1.75rem, 3.5vw, 2.75rem);
      font-style: italic;
      font-family: var(--font-display);
      font-weight: 300;
      color: var(--accent);
      line-height: 1.1;
    }
    .price-period {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(246,242,236,0.5);
    }
    .price-tagline {
      font-family: var(--font-display);
      font-size: 1rem;
      font-style: italic;
      font-weight: 300;
      color: rgba(246,242,236,0.6);
    }
    .pricing__features {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      list-style: none;
      flex: 1;
    }
    .pricing__features li {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: rgba(246,242,236,0.7);
      line-height: 1.5;
    }
    .pricing__features li::before {
      content: '✓';
      color: var(--accent);
      font-size: 0.8rem;
      flex-shrink: 0;
      margin-top: 0.05rem;
    }
    .pricing__card--bespoke .pricing__features li::before {
      content: '→';
    }
    .pricing__card-cta {
      margin-top: auto;
    }
    .pricing__footnote {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: rgba(246,242,236,0.3);
      margin-top: 1.25rem;
      line-height: 1.7;
    }
    .pricing__cta {
      margin-top: 2rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.875rem;
    }
    .btn--cream {
      background: var(--cream);
      color: var(--ink);
    }
    .btn--cream:hover { background: var(--accent); color: var(--white); }
    .btn--accent {
      background: var(--accent);
      color: var(--white);
    }
    .btn--accent:hover { background: #a8481f; }
    .btn--outline-cream {
      background: transparent;
      color: var(--cream);
      border: 1px solid rgba(246,242,236,0.25);
    }
    .btn--outline-cream:hover { border-color: rgba(246,242,236,0.6); }

    /* ─── Process ─── */
    .process {
      padding: clamp(3.5rem, 8vw, 5.5rem) var(--pad);
      max-width: var(--max);
      margin: 0 auto;
    }
    .process__steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-top: clamp(2rem, 4vw, 3rem);
      background: var(--white);
    }
    .process__step {
      padding: clamp(1.5rem, 3vw, 2.25rem);
      border-right: 1px solid var(--border);
    }
    .process__step:last-child { border-right: none; }
    .process__step-num {
      font-family: var(--font-display);
      font-size: 3rem;
      font-weight: 300;
      color: var(--faint);
      line-height: 1;
      margin-bottom: 1rem;
    }
    .process__step-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--ink);
      margin-bottom: 0.5rem;
      letter-spacing: -0.01em;
    }
    .process__step-body {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.7;
      color: var(--muted);
    }

    /* ─── Why us ─── */
    .why {
      background: var(--faint);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: clamp(3rem, 7vw, 5rem) var(--pad);
    }
    .why__inner {
      max-width: var(--max);
      margin: 0 auto;
    }
    .why__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: clamp(1.5rem, 3vw, 2.5rem);
      margin-top: clamp(2rem, 4vw, 3rem);
    }
    .why-point {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .why-point__mark {
      width: 2rem;
      height: 2px;
      background: var(--accent);
      margin-bottom: 0.5rem;
    }
    .why-point__title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--ink);
      letter-spacing: -0.01em;
    }
    .why-point__body {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.75;
      color: var(--muted);
    }

    /* ─── CTA ─── */
    .final-cta {
      padding: clamp(4rem, 10vw, 7rem) var(--pad);
      max-width: var(--max);
      margin: 0 auto;
      text-align: center;
    }
    .final-cta__title {
      font-family: var(--font-display);
      font-size: clamp(2.25rem, 6vw, 5rem);
      font-weight: 300;
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--ink);
      margin: 1rem 0 1.25rem;
    }
    .final-cta__title em { font-style: italic; color: var(--accent); }
    .final-cta__sub {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      line-height: 1.75;
      color: var(--muted);
      max-width: 48ch;
      margin: 0 auto 2.5rem;
    }
    .final-cta__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.875rem;
    }

    /* ─── Footer ─── */
    .footer {
      background: var(--ink);
      color: rgba(246,242,236,0.4);
      padding: 2.5rem var(--pad);
      border-top: 3px solid var(--accent);
    }
    .footer__inner {
      max-width: var(--max);
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .footer__logo {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(246,242,236,0.6);
    }
    .footer__logo span { color: var(--accent); }
    .footer__links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .footer__links a {
      font-family: var(--font-mono);
      font-size: 0.625rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(246,242,236,0.4);
      transition: color 0.15s;
    }
    .footer__links a:hover { color: rgba(246,242,236,0.8); }
    .footer__copy {
      font-family: var(--font-mono);
      font-size: 0.625rem;
      letter-spacing: 0.08em;
    }

    /* ─── Responsive ─── */
    @media (max-width: 860px) {
      .portfolio-card {
        grid-template-columns: 1fr;
      }
      .portfolio-card__media {
        order: -1;
      }
      .pricing__tiers {
        grid-template-columns: 1fr;
      }
      .process__steps {
        grid-template-columns: 1fr 1fr;
      }
      .process__step:nth-child(2) { border-right: none; }
      .process__step:nth-child(1),
      .process__step:nth-child(2) { border-bottom: 1px solid var(--border); }
      .why__grid {
        grid-template-columns: 1fr;
      }
      .services__grid {
        grid-template-columns: 1fr;
      }
      .service-item:nth-child(even) { border-right: 1px solid var(--border); }
      .service-item { border-right: none; }
      .service-item:last-child { border-bottom: none; }
    }

    @media (max-width: 560px) {
      .stats__inner {
        grid-template-columns: 1fr;
      }
      .stats__item:not(:last-child) {
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
      .process__steps {
        grid-template-columns: 1fr;
      }
      .process__step { border-right: none; border-bottom: 1px solid var(--border); }
      .process__step:last-child { border-bottom: none; }
      .nav__links a:not(.nav__cta) { display: none; }
      .portfolio-card__compare {
        grid-template-columns: 1fr;
      }
      .footer__inner {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    /* ─── Animations ─── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .hero__kicker  { animation: fadeUp 0.5s ease both; }
    .hero__headline { animation: fadeUp 0.5s 0.1s ease both; }
    .hero__sub     { animation: fadeUp 0.5s 0.2s ease both; }
    .hero__actions { animation: fadeUp 0.5s 0.3s ease both; }
  </style>
</head>
<body>

  <!-- Top accent stripe -->
  <div class="top-stripe"></div>

  <!-- ─── Nav ─── -->
  <nav class="nav">
    <div class="nav__inner">
      <a href="/" class="nav__logo">WEB<span>.</span>ISOLATED<span>.</span>TECH</a>
      <div class="nav__links">
        <a href="#work">Work</a>
        <a href="#services">Services</a>
        <a href="#pricing">Pricing</a>
        <a href="mailto:cody@isolated.tech?subject=Website%20Project%20Inquiry" class="nav__cta btn">Book a Call</a>
      </div>
    </div>
  </nav>

  <!-- ─── Hero ─── -->
  <section class="hero">
    <div class="hero__kicker">
      <span class="u-label">Client Web Services</span>
    </div>
    <h1 class="hero__headline">
      Websites that win <em>business.</em>
    </h1>
    <p class="hero__sub">
      We design and build premium websites for local businesses, founders, and growing brands —
      with positioning-first strategy, polished design, and a build model that actually
      makes financial sense.
    </p>
    <div class="hero__actions">
      <a href="mailto:cody@isolated.tech?subject=Website%20Project%20Inquiry" class="btn btn--primary">Book an Intro Call</a>
      <a href="#work" class="btn btn--outline">See Client Work ↓</a>
    </div>
  </section>

  <!-- ─── Stats ─── -->
  <div class="stats">
    <div class="stats__inner">
      <div class="stats__item">
        <span class="stats__number">$0</span>
        <span class="stats__label">Build Cost</span>
      </div>
      <div class="stats__item">
        <span class="stats__number">200</span>
        <span class="stats__label">Per Month</span>
      </div>
      <div class="stats__item">
        <span class="stats__number">∞</span>
        <span class="stats__label">Edit Requests</span>
      </div>
    </div>
  </div>

  <!-- ─── Portfolio ─── -->
  <section id="work" class="portfolio">
    <div class="section-head">
      <span class="u-label">Selected Work</span>
      <h2 class="section-head__title">
        Real projects,<br/><em>real results.</em>
      </h2>
    </div>

    <div class="portfolio__grid">

      <!-- Roof Brite Hawaii -->
      <article class="portfolio-card">
        <div class="portfolio-card__media">
          <img
            src="https://isolated.tech/assets/screenshots/roofbrite.jpg"
            alt="Roof Brite Hawaii website"
            loading="lazy"
          />
        </div>
        <div class="portfolio-card__body">
          <p class="portfolio-card__client">Roof Brite Hawaii</p>
          <h3 class="portfolio-card__headline">From dated local-business site to high-trust conversion funnel.</h3>
          <p class="portfolio-card__summary">
            A full redesign focused on service clarity, trust signals, and a mobile-first inquiry
            flow for a pressure washing and roof treatment business in Hawaii.
          </p>

          <div class="portfolio-card__meta">
            <div class="portfolio-card__meta-row">
              <span class="portfolio-card__meta-label">Services</span>
              <span class="portfolio-card__meta-value">Positioning · Web Design · Copy · Build</span>
            </div>
            <div class="portfolio-card__meta-row">
              <span class="portfolio-card__meta-label">Stack</span>
              <span class="portfolio-card__meta-value">Next.js · Vercel · Responsive UI</span>
            </div>
          </div>

          <ul class="portfolio-card__outcomes">
            <li>Sharper service hierarchy with clear intent on every section</li>
            <li>Improved local trust framing through social proof and visual consistency</li>
            <li>Lead-first page structure with clearer paths to contact</li>
          </ul>

          <div class="portfolio-card__compare">
            <a href="https://www.roofbritehawaii.com/" target="_blank" rel="noopener" class="compare-item">
              <img src="https://isolated.tech/assets/screenshots/roofbrite-legacy.jpg" alt="Before redesign" loading="lazy" />
              <span class="compare-item__label">Before</span>
            </a>
            <a href="https://roofbrite.vercel.app/" target="_blank" rel="noopener" class="compare-item">
              <img src="https://isolated.tech/assets/screenshots/roofbrite.jpg" alt="After redesign" loading="lazy" />
              <span class="compare-item__label">After</span>
            </a>
          </div>

          <a href="https://roofbrite.vercel.app/" target="_blank" rel="noopener" class="portfolio-card__link">
            View live site <span>↗</span>
          </a>
        </div>
      </article>

      <!-- Talasofilia Pilates -->
      <article class="portfolio-card">
        <div class="portfolio-card__media">
          <img
            src="https://isolated.tech/assets/screenshots/talasofilia.jpg"
            alt="Talasofilia Pilates website"
            loading="lazy"
          />
        </div>
        <div class="portfolio-card__body">
          <p class="portfolio-card__client">Talasofilia Pilates</p>
          <h3 class="portfolio-card__headline">Editorial minimalism for a boutique wellness brand.</h3>
          <p class="portfolio-card__summary">
            A polished studio website that balances calm aesthetics with practical booking
            and pricing navigation for new students seeking a premium Pilates experience.
          </p>

          <div class="portfolio-card__meta">
            <div class="portfolio-card__meta-row">
              <span class="portfolio-card__meta-label">Services</span>
              <span class="portfolio-card__meta-value">Brand Translation · IA · UI Design · Dev</span>
            </div>
            <div class="portfolio-card__meta-row">
              <span class="portfolio-card__meta-label">Stack</span>
              <span class="portfolio-card__meta-value">Custom Frontend · Responsive · SEO</span>
            </div>
          </div>

          <ul class="portfolio-card__outcomes">
            <li>Clear service and class pathing for first-time visitors</li>
            <li>Elevated visual language aligned with premium studio positioning</li>
            <li>Fast-loading layout optimized for mobile discovery</li>
          </ul>

          <a href="https://talasofiliapilates.com/" target="_blank" rel="noopener" class="portfolio-card__link">
            View live site <span>↗</span>
          </a>
        </div>
      </article>

    </div>
  </section>

  <!-- ─── Services ─── -->
  <section id="services">
    <div class="services">
      <span class="u-label">What We Build</span>
      <h2 class="section-head__title" style="margin-top: 1rem; max-width: none;">
        The right website for<br/><em>where you are now.</em>
      </h2>
      <div class="services__grid">
        <div class="service-item">
          <div class="service-item__num">01</div>
          <h3 class="service-item__title">Marketing Websites</h3>
          <p class="service-item__desc">
            Full marketing sites for local service businesses — roofing, fitness, cleaning, consulting,
            salons, and more. Built to rank, convert, and represent your brand at its best.
          </p>
        </div>
        <div class="service-item">
          <div class="service-item__num">02</div>
          <h3 class="service-item__title">Landing Pages</h3>
          <p class="service-item__desc">
            Focused single-page launches for products, apps, events, and campaigns. One goal,
            one flow, clear CTA. Fast to build and fast to test.
          </p>
        </div>
        <div class="service-item">
          <div class="service-item__num">03</div>
          <h3 class="service-item__title">Brand & Portfolio Sites</h3>
          <p class="service-item__desc">
            Personal brand sites and creative portfolios for founders, coaches, freelancers,
            and professionals who want to show up online with confidence.
          </p>
        </div>
        <div class="service-item">
          <div class="service-item__num">04</div>
          <h3 class="service-item__title">Redesigns</h3>
          <p class="service-item__desc">
            Conversion-focused redesigns of existing websites that underperform. We audit your
            current site, identify friction, and rebuild with clarity and purpose.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Pricing ─── -->
  <section id="pricing" class="pricing">
    <div class="pricing__inner">
      <span class="u-label pricing__label">Pricing</span>
      <h2 class="pricing__title">
        A model that fits.<br/><em>Whatever your scope.</em>
      </h2>

      <div class="pricing__tiers">

        <!-- Standard -->
        <div class="pricing__card">
          <div class="pricing__card-head">
            <span class="u-label" style="color: rgba(246,242,236,0.4); letter-spacing: 0.18em;">Standard</span>
            <div class="pricing__main-price">
              <span class="price-amount"><sup>$</sup>200</span>
              <span class="price-period">per month — build is free</span>
              <span class="price-tagline">The most common fit for local businesses and founders.</span>
            </div>
          </div>
          <ul class="pricing__features">
            <li>Website design and build — $0 upfront</li>
            <li>$200/month ongoing subscription</li>
            <li>Unlimited edit requests included</li>
            <li>Hosting, updates, and maintenance covered</li>
            <li>Ongoing positioning and copy improvements</li>
            <li>Direct access to your developer</li>
            <li>Cancel anytime — you keep the code</li>
          </ul>
          <div class="pricing__card-cta">
            <a href="mailto:cody@isolated.tech?subject=Website%20Project%20Inquiry" class="btn btn--cream">Start a Project</a>
          </div>
        </div>

        <!-- Bespoke -->
        <div class="pricing__card pricing__card--bespoke">
          <div class="pricing__card-head">
            <span class="u-label" style="color: rgba(197,92,48,0.7); letter-spacing: 0.18em;">Bespoke</span>
            <div class="pricing__main-price">
              <span class="price-amount--custom">Built to spec,<br/>priced to match.</span>
              <span class="price-period" style="margin-top: 0.75rem;">custom quote — let's talk scope</span>
              <span class="price-tagline">For projects that need more than a standard site.</span>
            </div>
          </div>
          <ul class="pricing__features">
            <li>E-commerce storefronts and product catalogs</li>
            <li>Online booking and scheduling systems</li>
            <li>Custom web applications and dashboards</li>
            <li>Third-party API and CRM integrations</li>
            <li>Multi-page brand or campaign sites</li>
            <li>One-time project builds with full code handoff</li>
            <li>Retainer or milestone-based billing available</li>
          </ul>
          <div class="pricing__card-cta">
            <a href="mailto:cody@isolated.tech?subject=Bespoke%20Project%20Inquiry" class="btn btn--accent">Get a Quote</a>
          </div>
        </div>

      </div>

      <p class="pricing__footnote">
        Not sure which fits? Send a note with what you're building and we'll tell you straight.
        No sales pitch — just an honest read on scope and cost.
      </p>
      <div class="pricing__cta">
        <a href="https://isolated.tech/work" target="_blank" rel="noopener" class="btn btn--outline-cream">See Our Work ↗</a>
      </div>
    </div>
  </section>

  <!-- ─── Process ─── -->
  <section>
    <div class="process">
      <span class="u-label">How It Works</span>
      <h2 class="section-head__title" style="margin-top: 1rem;">
        Simple process,<br/><em>fast results.</em>
      </h2>
      <div class="process__steps">
        <div class="process__step">
          <div class="process__step-num">01</div>
          <h3 class="process__step-title">Discovery</h3>
          <p class="process__step-body">
            We align on goals, customer profile, offer structure, and what the website
            needs to do for your business. One focused conversation.
          </p>
        </div>
        <div class="process__step">
          <div class="process__step-num">02</div>
          <h3 class="process__step-title">Direction</h3>
          <p class="process__step-body">
            Clear visual and messaging direction so the site feels premium and instantly
            understandable. You see it before a line of code is written.
          </p>
        </div>
        <div class="process__step">
          <div class="process__step-num">03</div>
          <h3 class="process__step-title">Build</h3>
          <p class="process__step-body">
            Fast, responsive implementation with thoughtful details and conversion-focused
            structure. Typically live within two weeks of kick-off.
          </p>
        </div>
        <div class="process__step">
          <div class="process__step-num">04</div>
          <h3 class="process__step-title">Launch &amp; Iterate</h3>
          <p class="process__step-body">
            Deployment, QA, and handoff — then ongoing improvements based on real feedback
            and performance data. Your site evolves as your business grows.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Why us ─── -->
  <section class="why">
    <div class="why__inner">
      <span class="u-label">Why Isolated.tech</span>
      <h2 class="section-head__title" style="margin-top: 1rem;">
        Built different.
      </h2>
      <div class="why__grid">
        <div class="why-point">
          <div class="why-point__mark"></div>
          <h3 class="why-point__title">Product-quality execution</h3>
          <p class="why-point__body">
            We build product software — iOS apps, macOS apps, dev tools. That same craft and
            precision comes to every client website. No templates, no shortcuts.
          </p>
        </div>
        <div class="why-point">
          <div class="why-point__mark"></div>
          <h3 class="why-point__title">Positioning before pixels</h3>
          <p class="why-point__body">
            Great design starts with clear thinking. We help you understand and articulate your
            positioning before we design a single page — so the site actually converts.
          </p>
        </div>
        <div class="why-point">
          <div class="why-point__mark"></div>
          <h3 class="why-point__title">No agency overhead</h3>
          <p class="why-point__body">
            You work directly with the person building your site. No project managers, no
            handoffs, no markups. Fast decisions, fast delivery.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── Final CTA ─── -->
  <section class="final-cta">
    <span class="u-label">Get Started</span>
    <h2 class="final-cta__title">
      Ready to have a website<br/>that <em>works for you?</em>
    </h2>
    <p class="final-cta__sub">
      Send your current site (if you have one), your goals, and a rough timeline.
      We'll reply with next steps and availability — usually within a day.
    </p>
    <div class="final-cta__actions">
      <a href="mailto:cody@isolated.tech?subject=Website%20Project%20Inquiry" class="btn btn--primary">Email Cody Directly</a>
      <a href="https://isolated.tech/hire" target="_blank" rel="noopener" class="btn btn--outline">Learn More ↗</a>
    </div>
  </section>

  <!-- ─── Footer ─── -->
  <footer class="footer">
    <div class="footer__inner">
      <a href="/" class="footer__logo">WEB<span>.</span>ISOLATED<span>.</span>TECH</a>
      <div class="footer__links">
        <a href="#work">Work</a>
        <a href="#services">Services</a>
        <a href="#pricing">Pricing</a>
        <a href="https://isolated.tech" target="_blank" rel="noopener">Main Site</a>
        <a href="https://isolated.tech/privacy" target="_blank" rel="noopener">Privacy</a>
        <a href="mailto:cody@isolated.tech">Contact</a>
      </div>
      <span class="footer__copy">© 2026 ISOLATED.TECH</span>
    </div>
  </footer>

</body>
</html>`;

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only serve for web.isolated.tech
    if (url.hostname !== "web.isolated.tech") {
      return new Response("Not found", { status: 404 });
    }

    // All paths serve the single-page site
    return new Response(HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  },
};
