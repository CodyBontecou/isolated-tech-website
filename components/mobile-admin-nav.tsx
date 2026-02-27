"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "OVERVIEW",
    links: [{ href: "/admin", icon: "◉", text: "Dashboard" }],
  },
  {
    label: "CATALOG",
    links: [
      { href: "/admin/apps", icon: "☎", text: "Apps" },
      { href: "/admin/codes", icon: "%", text: "Discount Codes" },
    ],
  },
  {
    label: "CUSTOMERS",
    links: [
      { href: "/admin/purchases", icon: "$", text: "Purchases" },
      { href: "/admin/downloads", icon: "↓", text: "Downloads" },
      { href: "/admin/users", icon: "◎", text: "Users" },
    ],
  },
  {
    label: "SUPPORT",
    links: [
      { href: "/admin/feedback", icon: "∴", text: "Feedback" },
      { href: "/admin/feature-requests", icon: "★", text: "Feature Requests" },
      { href: "/admin/help-articles", icon: "≡", text: "Help Articles" },
    ],
  },
  {
    label: "MARKETING",
    links: [
      { href: "/admin/subscribers", icon: "@", text: "Subscribers" },
      { href: "/admin/broadcasts", icon: "✉", text: "Broadcasts" },
    ],
  },
  {
    label: "SETTINGS",
    links: [{ href: "/admin/api-keys", icon: "⚿", text: "API Keys" }],
  },
];

export function MobileAdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <>
      {/* Hamburger button */}
      <button
        className="mobile-admin-toggle"
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

      {/* Overlay */}
      <div
        className={`mobile-admin-overlay ${isOpen ? "mobile-admin-overlay--visible" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out menu */}
      <div className={`mobile-admin-menu ${isOpen ? "mobile-admin-menu--open" : ""}`}>
        <div className="mobile-admin-menu__header">
          <span className="mobile-admin-menu__title">Admin Menu</span>
          <button
            className="mobile-admin-menu__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="mobile-admin-menu__nav">
          {navSections.map((section) => (
            <div key={section.label} className="mobile-admin-menu__section">
              <div className="mobile-admin-menu__label">{section.label}</div>
              {section.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`mobile-admin-menu__link ${
                    pathname === link.href ? "mobile-admin-menu__link--active" : ""
                  }`}
                >
                  <span className="mobile-admin-menu__icon">{link.icon}</span>
                  <span>{link.text}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
