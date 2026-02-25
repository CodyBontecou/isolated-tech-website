"use client";

import { useRouter } from "next/navigation";
import { ReactNode, MouseEvent, useRef } from "react";

interface ViewTransitionLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  transitionSelector?: string; // CSS selector for the element to animate
  transitionName?: string; // The view-transition-name to apply
}

export function ViewTransitionLink({ 
  href, 
  children, 
  className, 
  style,
  transitionSelector = '[data-transition-icon]',
  transitionName = 'app-icon'
}: ViewTransitionLinkProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Check if View Transitions API is supported
    if (document.startViewTransition) {
      // Find the element to transition within this link
      const transitionElement = linkRef.current?.querySelector(transitionSelector) as HTMLElement | null;
      
      // Temporarily set the view-transition-name on the element
      if (transitionElement) {
        transitionElement.style.viewTransitionName = transitionName;
      }

      const transition = document.startViewTransition(() => {
        router.push(href);
      });

      // Clean up after transition completes
      try {
        await transition.finished;
      } finally {
        if (transitionElement) {
          transitionElement.style.viewTransitionName = '';
        }
      }
    } else {
      // Fallback for browsers without View Transitions
      router.push(href);
    }
  };

  return (
    <a
      ref={linkRef}
      href={href}
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
