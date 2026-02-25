"use client";

import { useEffect } from "react";

export function ScrollRevealInit() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    // Mark static elements for reveal
    const selectors = [
      ".section-header",
      ".section-title",
      ".about__description",
      ".about__capabilities",
      ".about__image-stack",
      ".contact__left",
      ".contact__right",
      ".stat",
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!el.classList.contains("reveal")) {
          el.classList.add("reveal");
        }
      });
    });

    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      observer.observe(el);
    });

    // Nav scroll effect
    const nav = document.querySelector(".nav");
    const handleScroll = () => {
      if (nav instanceof HTMLElement) {
        nav.style.borderBottomColor = window.scrollY > 100 ? "#444" : "#333";
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
