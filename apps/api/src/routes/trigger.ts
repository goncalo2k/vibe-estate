import { Hono } from "hono";
import type { AppEnv } from "../bindings.js";
import { runScrapeJob } from "../services/scraper.js";
import { runNotificationJob } from "../services/email.js";
import { runAnalysisBatch, markStaleProperties } from "../scheduled/cron.js";

export const triggerRoutes = new Hono<AppEnv>()
  .post("/scrape", async (c) => {
    await runScrapeJob(c.env);
    return c.json({ ok: true, job: "scrape" });
  })
  .post("/analyze", async (c) => {
    await runAnalysisBatch(c.env);
    return c.json({ ok: true, job: "analyze" });
  })
  .post("/notify", async (c) => {
    await runNotificationJob(c.env);
    return c.json({ ok: true, job: "notify" });
  })
  .post("/stale", async (c) => {
    await markStaleProperties(c.env);
    return c.json({ ok: true, job: "stale" });
  })
  .post("/all", async (c) => {
    await runScrapeJob(c.env);
    await runAnalysisBatch(c.env);
    await runNotificationJob(c.env);
    return c.json({ ok: true, job: "all" });
  });
