import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout", "/cart", "/account", "/order-confirmed"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
