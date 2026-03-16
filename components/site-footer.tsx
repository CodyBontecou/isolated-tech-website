"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

interface SiteFooterProps {
  showTagline?: boolean;
}

export function SiteFooter({ showTagline = true }: SiteFooterProps) {
  return (
    <footer className="store-footer">
      <div className="store-footer__brand">
        <span className="store-footer__logo">
          ISOLATED<span className="dot">.</span>TECH
        </span>
        {showTagline && (
          <span className="store-footer__tagline">Apps + client websites. Built to ship.</span>
        )}
      </div>
      <div className="store-footer__links">
        <Link href="/apps">APPS</Link>
        <Link href="/work">CLIENT WORK</Link>
        <Link href="/hire">HIRE</Link>
        <Link href="/seller">SELL WITH US</Link>
        <a href="/feedback">FEEDBACK</a>
        <a href="/roadmap">ROADMAP</a>
        <a href="/help">HELP</a>
        <a href="https://instagram.com/isolated.tech" target="_blank" rel="noopener">
          INSTAGRAM
        </a>
        <a href="https://tiktok.com/@isolated.tech" target="_blank" rel="noopener">
          TIKTOK
        </a>
        <Link href="/privacy">PRIVACY</Link>
        <Link href="/terms">TERMS</Link>
        <a href="mailto:cody@isolated.tech">CONTACT</a>
      </div>
      <div className="store-footer__bottom">
        <span className="store-footer__copy">© 2026 ISOLATED.TECH</span>
        <ThemeToggle />
      </div>
    </footer>
  );
}
