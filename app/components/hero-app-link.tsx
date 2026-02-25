"use client";

import { useRouter } from "next/navigation";
import { ReactNode, MouseEvent } from "react";

interface HeroAppLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  heroIconId: string; // ID of the hero icon element to transition
}

export function HeroAppLink({ href, children, className, heroIconId }: HeroAppLinkProps) {
  const router = useRouter();

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Check if View Transitions API is supported
    if (document.startViewTransition) {
      // Find the hero icon by ID in the document
      const iconElement = document.getElementById(heroIconId) as HTMLElement | null;
      
      // Temporarily set the view-transition-name on the icon
      if (iconElement) {
        iconElement.style.viewTransitionName = 'app-icon';
      }

      const transition = document.startViewTransition(() => {
        router.push(href);
      });

      // Clean up after transition completes
      try {
        await transition.finished;
      } finally {
        if (iconElement) {
          iconElement.style.viewTransitionName = '';
        }
      }
    } else {
      // Fallback for browsers without View Transitions
      router.push(href);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
