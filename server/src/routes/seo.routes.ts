import { Router } from "express";

import { env } from "../config/env";
import { asyncHandler } from "../lib/async-handler";
import { PropertyModel } from "../models/property.model";

export const seoRouter = Router();

const staticPaths = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/properties", priority: "0.9", changefreq: "daily" },
  { path: "/agents", priority: "0.7", changefreq: "weekly" },
  { path: "/about", priority: "0.4", changefreq: "monthly" },
  { path: "/contact", priority: "0.4", changefreq: "monthly" },
  { path: "/faq", priority: "0.4", changefreq: "monthly" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
  { path: "/list-property", priority: "0.6", changefreq: "monthly" },
];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

seoRouter.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const base = env.CORS_ORIGIN.replace(/\/$/, "");
    const now = new Date().toISOString();
    const listings = await PropertyModel.find({
      status: "approved",
      hiddenBySuspension: { $ne: true },
    })
      .sort({ publishedAt: -1 })
      .select("slug updatedAt")
      .limit(10_000);

    const urls = [
      ...staticPaths.map(
        (entry) =>
          `<url><loc>${escapeXml(base + entry.path)}</loc><lastmod>${now}</lastmod><priority>${entry.priority}</priority><changefreq>${entry.changefreq}</changefreq></url>`,
      ),
      ...listings.map(
        (listing) =>
          `<url><loc>${escapeXml(`${base}/properties/${listing.slug}`)}</loc><lastmod>${new Date(listing.updatedAt).toISOString()}</lastmod><priority>0.8</priority><changefreq>weekly</changefreq></url>`,
      ),
    ];

    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600")
      .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  }),
);