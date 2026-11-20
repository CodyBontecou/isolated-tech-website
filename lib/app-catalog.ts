/**
 * Every isolated.tech app across platforms, for the home page directory.
 *
 * The D1 `apps` table only models iOS/macOS store listings, so Android,
 * web and direct-download availability live here. Sources (checked 2026-11-20):
 * - App Store developer page: apps.apple.com/us/developer/id1850631579
 * - Google Play developer page: "Cody R Bontecou"
 * - Each app's own website.
 *
 * Only list a platform when the app ships natively there, and only link to pages
 * that let someone get the app. Links are absolute so they work in every environment.
 * iPhone/iPad apps that merely run on Apple silicon Macs are not listed as Mac apps.
 *
 * `source` lists public GitHub repositories only (checked with `gh repo view`).
 */

export type CatalogPlatform = "ios" | "android" | "mac" | "web";

export interface CatalogLink {
  platform: CatalogPlatform;
  /** Where to get it on this platform. */
  href: string;
  /** Short label for the link, e.g. "App Store". */
  label: string;
  /** Extra detail, e.g. "iPhone · iPad · Watch". */
  note?: string;
  /** Not released yet on this platform. */
  comingSoon?: boolean;
}

export interface CatalogApp {
  /** Matches the D1 slug when the app is also in the store, so its icon can be reused. */
  slug: string;
  name: string;
  /** App icon served from /public. */
  icon: string;
  tagline: string;
  website?: string;
  /** Public source repositories, when the app is open source. */
  source?: { label: string; href: string }[];
  links: CatalogLink[];
}

export const PLATFORM_LABELS: Record<CatalogPlatform, string> = {
  ios: "iOS",
  android: "Android",
  mac: "Mac",
  web: "Web",
};

export const PLATFORM_ORDER: CatalogPlatform[] = ["ios", "android", "mac", "web"];

const APP_STORE = (path: string) => `https://apps.apple.com/us/app/${path}`;
const PLAY = (id: string) => `https://play.google.com/store/apps/details?id=${id}`;

export const APP_CATALOG: CatalogApp[] = [
  {
    slug: "healthmd",
    name: "Health.md",
    icon: "/assets/app-icons/healthmd.jpg",
    tagline: "Export Apple Health and Health Connect data to Markdown, CSV, JSON or Obsidian.",
    website: "https://healthmd.app",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/health-md" },
    ],
    links: [
      { platform: "ios", href: APP_STORE("health-md/id6757763969"), label: "App Store", note: "iPhone · iPad · Watch" },
      { platform: "android", href: PLAY("com.healthmd.android"), label: "Google Play" },
      { platform: "mac", href: APP_STORE("health-md/id6757763969"), label: "Mac App Store" },
    ],
  },
  {
    slug: "voxboard",
    name: "Vox.md",
    icon: "/assets/app-icons/voxboard.jpg",
    tagline: "Quick capture for Obsidian and Markdown: text, links, photos, scans and voice notes.",
    website: "https://vox.isolated.tech",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/vox.md" },
    ],
    links: [
      { platform: "ios", href: APP_STORE("vox-md-quick-capture-notes/id6758967337"), label: "App Store", note: "iPhone · iPad · Watch" },
      { platform: "android", href: PLAY("md.vox.android"), label: "Google Play" },
      { platform: "mac", href: APP_STORE("vox-md-quick-capture-notes/id6758967337"), label: "Mac App Store" },
    ],
  },
  {
    slug: "syncmd",
    name: "GitSync.md",
    icon: "/assets/app-icons/syncmd.jpg",
    tagline: "A Git client for your phone. Sync Obsidian vaults and publish notes to GitHub.",
    website: "https://gitsync.md",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/GitSync.md" },
      { label: "GitHub · Android", href: "https://github.com/CodyBontecou/sync-md-android" },
    ],
    links: [
      { platform: "ios", href: APP_STORE("gitsync-md-git-client/id6758960270"), label: "App Store", note: "iPhone · iPad" },
      { platform: "android", href: PLAY("com.bontecou.syncmd"), label: "Google Play" },
    ],
  },
  {
    slug: "whereday",
    name: "Whereday",
    icon: "/assets/app-icons/whereday.jpg",
    tagline: "On-device location history. Visits and GPS routes, exported to GPX, CSV or GeoJSON.",
    website: "https://whereday.com",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/whereday" },
    ],
    links: [
      { platform: "ios", href: APP_STORE("whereday-location-history/id6761960794"), label: "App Store", note: "iPhone · iPad · Watch" },
      { platform: "android", href: PLAY("com.bontecou.whereday"), label: "Google Play" },
    ],
  },
  {
    slug: "myself-md",
    name: "myself.md",
    icon: "/assets/app-icons/myself-md.png",
    tagline: "Personal data for AI agents. Share health, screen time and location with access you approve.",
    website: "https://myself.md",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/myself.md" },
    ],
    links: [
      { platform: "android", href: PLAY("com.myself.md"), label: "Google Play" },
      { platform: "web", href: "https://myself.md/dashboard", label: "Web dashboard" },
    ],
  },
  {
    slug: "thumble",
    name: "Thumble",
    icon: "/assets/app-icons/thumble.png",
    tagline: "Turn your phone into a game controller for your Mac or PC.",
    website: "https://thumble.io",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/Thumble" },
    ],
    links: [
      { platform: "android", href: PLAY("com.thumble.android"), label: "Google Play" },
      { platform: "ios", href: "https://apps.apple.com/app/id6826421489", label: "App Store", comingSoon: true },
      { platform: "mac", href: "https://thumble.io/download#receivers", label: "Receiver", note: "Mac · PC" },
    ],
  },
  {
    slug: "imghost",
    name: "imghost",
    icon: "/assets/app-icons/imghost.jpg",
    tagline: "Upload images from the Share Sheet and copy direct links instantly.",
    website: "https://imghost.isolated.tech",
    source: [
      { label: "GitHub", href: "https://github.com/CodyBontecou/imghost" },
    ],
    links: [
      { platform: "ios", href: APP_STORE("imghost/id6758588596"), label: "App Store", note: "iPhone · iPad" },
      { platform: "mac", href: APP_STORE("imghost/id6758588596"), label: "Mac App Store" },
    ],
  },
  {
    slug: "elide",
    name: "Elide",
    icon: "/assets/app-icons/elide.jpg",
    tagline: "Edit audio and video like text. Private, on-device transcripts.",
    website: "https://pocketcut.isolated.tech",
    links: [
      { platform: "ios", href: APP_STORE("elide-text-video-editor/id6796594117"), label: "App Store", note: "iPhone" },
    ],
  },
  {
    slug: "instareply",
    name: "Instarep.ly",
    icon: "/assets/app-icons/instareply.jpg",
    tagline: "An AI reply keyboard for creators, generated on-device with Apple Intelligence.",
    website: "https://instareply.isolated.tech",
    links: [
      { platform: "ios", href: APP_STORE("instarep-ly/id6754865693"), label: "App Store", note: "iPhone · iPad" },
    ],
  },
  {
    slug: "time-md",
    name: "time.md",
    icon: "/assets/app-icons/time-md.png",
    tagline: "Private Screen Time analytics for macOS, with exact app hours and exportable reports.",
    website: "https://timemd.app",
    links: [{ platform: "mac", href: "https://timemd.app", label: "Download" }],
  },
  {
    slug: "sub-md",
    name: "sub.md",
    icon: "/assets/app-icons/sub-md.png",
    tagline: "Track and analyze your Reddit usage patterns.",
    links: [{ platform: "mac", href: "https://isolated.tech/apps/sub-md", label: "isolated.tech" }],
  },
];

/** Platforms an app is released on (coming-soon links excluded). */
export function releasedPlatforms(app: CatalogApp): CatalogPlatform[] {
  return PLATFORM_ORDER.filter((p) => app.links.some((l) => l.platform === p && !l.comingSoon));
}
