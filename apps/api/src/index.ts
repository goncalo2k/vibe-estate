import app from "./app.js";
import { handleScheduled } from "./scheduled/cron.js";
import type { Bindings } from "./bindings.js";

export default {
  fetch: app.fetch,

  async scheduled(
    controller: ScheduledController,
    env: Bindings,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(handleScheduled(controller, env));
  },
};
