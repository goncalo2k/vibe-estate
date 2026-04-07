// This file exists solely to export the Hono RPC type for the frontend.
// It re-exports AppType without pulling in Cloudflare-specific bindings.
export type { AppType } from "./app.js";
