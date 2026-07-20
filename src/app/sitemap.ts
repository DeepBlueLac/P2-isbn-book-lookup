import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://books.bulidoge.site";
  const lastModified = new Date("2026-07-20");
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/isbn-lookup`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/find-book-by-title`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/public-domain-book-finder`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
