import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page is personalized and rendered per request, so no incremental cache is configured.
export default defineCloudflareConfig({});
