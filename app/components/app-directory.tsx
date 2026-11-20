"use client";

import { useState } from "react";
import {
  APP_CATALOG,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  releasedPlatforms,
  type CatalogPlatform,
} from "@/lib/app-catalog";

type Filter = "all" | CatalogPlatform;

interface AppDirectoryProps {
  /** App icons from the store database, keyed by slug. */
  icons?: Record<string, string>;
}

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

export function AppDirectory({ icons = {} }: AppDirectoryProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = Object.fromEntries(
    PLATFORM_ORDER.map((p) => [p, APP_CATALOG.filter((a) => releasedPlatforms(a).includes(p)).length]),
  ) as Record<CatalogPlatform, number>;

  const apps =
    filter === "all" ? APP_CATALOG : APP_CATALOG.filter((a) => a.links.some((l) => l.platform === filter));

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: APP_CATALOG.length },
    ...PLATFORM_ORDER.map((p) => ({ id: p as Filter, label: PLATFORM_LABELS[p], count: counts[p] })),
  ];

  return (
    <div className="app-dir">
      <div className="app-dir__filters" role="group" aria-label="Filter apps by platform">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className="app-dir__filter"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="app-dir__count">{f.count}</span>
          </button>
        ))}
      </div>

      <ul className="app-dir__grid">
        {apps.map((app) => {
          const icon = app.icon ?? icons[app.slug];
          const links =
            filter === "all"
              ? [...app.links].sort(
                  (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform),
                )
              : app.links.filter((l) => l.platform === filter);

          return (
            <li key={app.slug} className="app-dir__card">
              <div className="app-dir__head">
                <div className="app-dir__icon">
                  {icon ? <img src={icon} alt="" width={44} height={44} loading="lazy" /> : <span aria-hidden="true">{app.name[0].toUpperCase()}</span>}
                </div>
                <div className="app-dir__platforms" aria-label="Platforms">
                  {releasedPlatforms(app).map((p) => PLATFORM_LABELS[p]).join(" · ")}
                </div>
              </div>

              <h3 className="app-dir__name">
                {app.website ? (
                  <a href={app.website} target="_blank" rel="noopener">
                    {app.name}
                    <span className="sr-only"> website (opens in a new tab)</span>
                  </a>
                ) : (
                  app.name
                )}
              </h3>
              <p className="app-dir__tagline">{app.tagline}</p>

              <ul className="app-dir__links">
                {links.map((link) => (
                  <li key={`${link.platform}-${link.href}`}>
                    <a
                      href={link.href}
                      className={`app-dir__link${link.comingSoon ? " app-dir__link--soon" : ""}`}
                      {...(isExternal(link.href) ? { target: "_blank", rel: "noopener" } : {})}
                    >
                      <span className="app-dir__link-platform">{PLATFORM_LABELS[link.platform]}</span>
                      <span className="app-dir__link-label">
                        {link.comingSoon ? "Coming soon" : link.label}
                        {link.note && !link.comingSoon ? <span className="app-dir__link-note"> · {link.note}</span> : null}
                      </span>
                      <span aria-hidden="true" className="app-dir__arrow">
                        {isExternal(link.href) ? "↗" : "→"}
                      </span>
                    </a>
                  </li>
                ))}
                {filter === "all" &&
                  app.source?.map((repo) => (
                    <li key={repo.href}>
                      <a href={repo.href} className="app-dir__link" target="_blank" rel="noopener">
                        <span className="app-dir__link-platform">Code</span>
                        <span className="app-dir__link-label">{repo.label}</span>
                        <span aria-hidden="true" className="app-dir__arrow">
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
