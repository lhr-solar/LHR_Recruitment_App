import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Every image is a local file already sized for the page (photos are 1600px JPEGs). On Cloudflare
  // the optimizer re-encodes each one per request without caching, which took most of a second
  // per photo, so they're served as static assets instead.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // Resumes and portfolio files go straight to Supabase Storage from the browser,
      // so server actions only carry form fields.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
