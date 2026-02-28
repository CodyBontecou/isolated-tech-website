"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  text: string;
  icon: string;
}

interface MobileSiteNavProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export function MobileSiteNav({ isLoggedIn, isAdmin }: MobileSiteNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const navLinks: NavLink[] = [
    { href: "/", icon: "◉", text: "Home" },
    { href: "/#apps", icon: "☎", text: "Apps" },
    { href: "/feedback", icon: "∴", text: "Feedback" },
    { href: "/roadmap", icon: "★", text: "Roadmap" },
  ];

  const userLinks: NavLink[] = isLoggedIn
    ? [
        ...(isAdmin ? [{ href: "/admin", icon: "⚙", text: "Admin" }] : []),
        { href: "/dashboard", icon: "◎", text: "Dashboard" },
      ]
    : [{ href: "/auth/login", icon: "→", text: "Sign In" }];

  // Ensure portal target is available (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const overlayAndMenu = (
    <>
      {/* Overlay */}
      <div
        className={`mobile-site-overlay ${isOpen ? "mobile-site-overlay--visible" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out menu */}
      <div className={`mobile-site-menu ${isOpen ? "mobile-site-menu--open" : ""}`}>
        <div className="mobile-site-menu__header">
          <span className="mobile-site-menu__title">
            ISOLATED<span className="dot">.</span>TECH
          </span>
          <button
            className="mobile-site-menu__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="mobile-site-menu__nav">
          <div className="mobile-site-menu__section">
            <div className="mobile-site-menu__label">NAVIGATION</div>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`mobile-site-menu__link ${
                  pathname === link.href ? "mobile-site-menu__link--active" : ""
                }`}
              >
                <span className="mobile-site-menu__icon">{link.icon}</span>
                <span>{link.text}</span>
              </a>
            ))}
          </div>

          <div className="mobile-site-menu__section">
            <div className="mobile-site-menu__label">ACCOUNT</div>
            {userLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`mobile-site-menu__link ${
                  pathname === link.href ? "mobile-site-menu__link--active" : ""
                }`}
              >
                <span className="mobile-site-menu__icon">{link.icon}</span>
                <span>{link.text}</span>
              </a>
            ))}
            {isLoggedIn && (
              <button
                onClick={handleSignOut}
                className="mobile-site-menu__link mobile-site-menu__link--button"
              >
                <span className="mobile-site-menu__icon">←</span>
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button stays in the nav */}
      <button
        className="mobile-site-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <span className={`hamburger ${isOpen ? "hamburger--open" : ""}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {/* Portal the overlay and menu to document.body so they escape the nav's stacking context */}
      {mounted && createPortal(overlayAndMenu, document.body)}
    </>
  );
}
