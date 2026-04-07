import { Hono } from "hono";
import type { AppEnv } from "../bindings.js";

export const healthRoutes = new Hono<AppEnv>().get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});
