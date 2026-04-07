import { Hono } from "hono";
import type { AppEnv } from "./bindings.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error.js";
import { healthRoutes } from "./routes/health.js";
import { propertyRoutes } from "./routes/properties.js";
import { searchRoutes } from "./routes/searches.js";
import { analysisRoutes } from "./routes/analysis.js";
import { triggerRoutes } from "./routes/trigger.js";

const app = new Hono<AppEnv>()
  .use("/*", corsMiddleware)
  .use("/*", errorHandler)
  .route("/api/health", healthRoutes)
  .route("/api/properties", propertyRoutes)
  .route("/api/searches", searchRoutes)
  .route("/api/analysis", analysisRoutes)
  .route("/api/trigger", triggerRoutes);

export type AppType = typeof app;
export default app;
