import type { ReactElement } from "react";
import { PLATFORM_ORDER, type CatalogLink, type CatalogPlatform } from "@/lib/app-catalog";

const ICON_LABELS: Record<CatalogPlatform, string> = {
  ios: "Download on the App Store",
  android: "Get it on Google Play",
  mac: "Get it for Mac",
  web: "Open the web app",
};

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

function MacIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

const ICONS: Record<CatalogPlatform, () => ReactElement> = {
  ios: AppleIcon,
  android: GooglePlayIcon,
  mac: MacIcon,
  web: WebIcon,
};

interface StoreIconLinksProps {
  appName: string;
  links: CatalogLink[];
  /** App website; shown as the app's own icon, right after the Mac column. */
  website?: string;
  /** App icon used for the website link. */
  icon?: string;
  /** Public source repository, shown as a GitHub icon in the last column. */
  source?: string;
}

function PlatformLink({ appName, link }: { appName: string; link: CatalogLink }) {
  const Icon = ICONS[link.platform];
  const external = /^https?:\/\//.test(link.href);
  return (
    <a
      href={link.href}
      className={`store-icons__link store-icons__link--${link.platform}`}
      aria-label={`${appName}: ${ICON_LABELS[link.platform]}`}
      title={ICON_LABELS[link.platform]}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
    >
      <Icon />
    </a>
  );
}

/**
 * One icon link per store (App Store, Google Play, Mac), pointing at the install page,
 * then the app's own greyed-out icon linking to its web app or, failing that, its website.
 * Every column keeps a fixed slot so icons line up when rows are stacked.
 */
export function StoreIconLinks({ appName, links, website, icon, source }: StoreIconLinksProps) {
  // The app icon is the way in on the web: a web app wins over the marketing site.
  const webApp = links.find((l) => l.platform === "web" && !l.comingSoon);
  const siteHref = webApp?.href ?? website;
  const siteLabel = webApp ? "Open the web app" : "Visit the website";
  const slot = (key: string) => <span key={key} className="store-icons__slot" aria-hidden="true" />;

  return (
    <span className="store-icons">
      {PLATFORM_ORDER.filter((platform) => platform !== "web").flatMap((platform) => {
        const link = links.find((l) => l.platform === platform && !l.comingSoon);
        const cells = [link ? <PlatformLink key={platform} appName={appName} link={link} /> : slot(platform)];

        if (platform === "mac") {
          cells.push(
            siteHref && icon ? (
              <a
                key="website"
                href={siteHref}
                className="store-icons__link store-icons__link--site"
                aria-label={`${appName}: ${siteLabel}`}
                title={siteLabel}
                target="_blank"
                rel="noopener"
              >
                <img src={icon} alt="" width={16} height={16} />
              </a>
            ) : (
              slot("website")
            ),
          );
        }
        return cells;
      })}
      {source ? (
        <a
          href={source}
          className="store-icons__link store-icons__link--source"
          aria-label={`${appName}: Source code on GitHub`}
          title="Source code on GitHub"
          target="_blank"
          rel="noopener"
        >
          <GitHubIcon />
        </a>
      ) : (
        slot("source")
      )}
    </span>
  );
}
