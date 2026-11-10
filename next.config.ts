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
