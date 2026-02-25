import { MetadataRoute } from "next";

const siteUrl = "https://isolated.tech";

// Static apps for sitemap (in production, fetch from D1)
const APPS = [
  { slug: "voxboard", updatedAt: "2026-02-20" },
  { slug: "syncmd", updatedAt: "2026-02-10" },
  { slug: "healthmd", updatedAt: "2026-02-01" },
  { slug: "imghost", updatedAt: "2026-02-10" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/apps`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const appPages: MetadataRoute.Sitemap = APPS.flatMap((app) => [
    {
      url: `${siteUrl}/apps/${app.slug}`,
      lastModified: new Date(app.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/apps/${app.slug}/changelog`,
      lastModified: new Date(app.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ]);

  return [...staticPages, ...appPages];
}
