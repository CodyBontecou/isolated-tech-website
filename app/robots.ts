import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://isolated.tech";

  return {
    rules: [
      {
        userAgent: "*",
        // /api/ is disallowed as a general rule, but expose the public ACP
        // feed and agent-checkout schema so AI agents can discover and buy.
        allow: ["/", "/api/acp/"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/auth/verify",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
