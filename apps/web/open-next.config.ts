import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: every page is rendered per request (the queue is per-user and uncached).
export default defineCloudflareConfig();
