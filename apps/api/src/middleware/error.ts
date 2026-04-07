import type { Context, Next } from "hono";
import type { AppEnv } from "../bindings.js";

export async function errorHandler(c: Context<AppEnv>, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
}
