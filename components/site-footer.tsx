"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface SiteFooterProps {
  showTagline?: boolean;
}

export function SiteFooter({ showTagline = true }: SiteFooterProps) {
  return (
    <footer className="store-footer">
      <div className="store-footer__main frame">
        <div className="store-footer__brand">
          <span className="store-footer__logo">
            <BrandMark size={18} />
            <span>
              ISOLATED<span className="dot">.</span>TECH
            </span>
          </span>
          {showTagline && (
            <span className="store-footer__tagline">Privacy-first apps and client websites. Built to ship.</span>
          )}
        </div>
        <div className="store-footer__links">
          <div className="store-footer__group">
            <span className="store-footer__heading">Product</span>
            <Link href="/apps">Apps</Link>
            <Link href="/changelog">Updates</Link>
            {isFeatureEnabled("sellerProgram") && <Link href="/seller">Sell with us</Link>}
          </div>
          <div className="store-footer__group">
            <span className="store-footer__heading">Studio</span>
            <Link href="/work">Client work</Link>
            <Link href="/hire">Hire</Link>
            <a href="/help">Help</a>
          </div>
          <div className="store-footer__group">
            <span className="store-footer__heading">Social</span>
            <a href="https://instagram.com/isolated.tech" target="_blank" rel="noopener">
              Instagram
            </a>
            <a href="https://tiktok.com/@isolated.tech" target="_blank" rel="noopener">
              TikTok
            </a>
          </div>
        </div>
      </div>
      <div className="store-footer__bottom frame">
        <span className="store-footer__copy">© 2026 ISOLATED.TECH</span>
        <div className="store-footer__legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:cody@isolated.tech">Contact</a>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
