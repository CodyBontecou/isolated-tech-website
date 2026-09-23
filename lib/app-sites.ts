export interface AppSite {
  name?: string;
  url: string;
}

/**
 * Dedicated marketing sites for apps that should link away from the
 * ISOLATED.TECH app directory. Keys are the canonical D1 app slugs.
 */
const APP_SITES: Readonly<Record<string, AppSite>> = {
  healthmd: {
    url: "https://healthmd.app",
  },
  syncmd: {
    url: "https://gitsyncmd.app",
  },
  voxboard: {
    name: "vox.md",
    url: "https://vox.isolated.tech",
  },
  imghost: {
    url: "https://imghost.isolated.tech",
  },
  "iso-me": {
    url: "https://isome.isolated.tech",
  },
  "instarep-ly": {
    url: "https://instareply.isolated.tech",
  },
  "time-md": {
    url: "https://timemd.isolated.tech",
  },
};

export function getAppSite(slug: string): AppSite | null {
  return APP_SITES[slug.trim().toLowerCase()] ?? null;
}

export function getAppDisplayName(slug: string, fallbackName: string): string {
  return getAppSite(slug)?.name ?? fallbackName;
}

export function getAppHref(slug: string): string {
  return getAppSite(slug)?.url ?? `/apps/${slug}`;
}
