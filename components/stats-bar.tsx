"use client";

import { useEffect, useRef, useState } from "react";

interface StatsBarProps {
  totalProducts: number;
  iosApps: number;
  websites: number;
}

function AnimatedNumber({
  target,
  label,
}: {
  target: number | string;
  label: string;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof target !== "number" || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);

            let current = 0;
            const duration = 1500;
            const step = Math.max(1, Math.ceil(target / (duration / 30)));
            const interval = setInterval(() => {
              current += step;
              if (current >= target) {
                current = target;
                clearInterval(interval);
              }
              setCount(current);
            }, 30);

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <div className="stat reveal" ref={ref}>
      <span className="stat__number">
        {typeof target === "number" ? count : target}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export function StatsBar({ totalProducts, iosApps, websites }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <AnimatedNumber target={totalProducts} label="PRODUCTS SHIPPED" />
      <AnimatedNumber target={iosApps} label="iOS APPS LIVE" />
      <AnimatedNumber target={websites} label="WEBSITES DEPLOYED" />
      <AnimatedNumber target="∞" label="MONOSPACE FONTS USED" />
    </div>
  );
}
