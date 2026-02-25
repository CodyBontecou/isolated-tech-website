import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://isolated.tech";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/auth/verify",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
