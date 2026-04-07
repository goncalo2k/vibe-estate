import type { Bindings } from "../bindings.js";
import { runScrapeJob } from "../services/scraper.js";
import { runNotificationJob } from "../services/email.js";

export async function handleScheduled(
  controller: ScheduledController,
  env: Bindings
) {
  console.log(`Cron triggered: ${controller.cron}`);

  switch (controller.cron) {
    case "0 */2 * * *":
      // Every 2 hours: scrape + notify
      await runScrapeJob(env);
      await runNotificationJob(env);
      break;
    case "0 */6 * * *":
      // Every 6 hours: AI analysis on unanalyzed properties
      await runAnalysisBatch(env);
      break;
    case "0 3 * * *":
      // Daily at 3 AM: mark stale properties
      await markStaleProperties(env);
      break;
  }
}

async function runAnalysisBatch(env: Bindings) {
  const { analyzeProperty } = await import("../services/analysis.js");
  const { generateId } = await import("../db/queries.js");
  const { rowToProperty } = await import("../db/queries.js");
  const db = env.DB;

  const unanalyzed = await db
    .prepare(
      `SELECT p.* FROM properties p
       LEFT JOIN analyses a ON a.property_id = p.id
       WHERE a.id IS NULL AND p.is_active = 1
       LIMIT 20`
    )
    .all();

  for (const row of unanalyzed.results) {
    try {
      const property = rowToProperty(row as any);
      const analysis = await analyzeProperty(property, env.ANTHROPIC_API_KEY);
      const id = generateId();
      await db
        .prepare(
          `INSERT INTO analyses (
            id, property_id, summary, rating, score,
            price_per_m2_cents, market_avg_price_per_m2_cents,
            pros, cons, raw_response, model
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          (row as any).id,
          analysis.summary,
          analysis.rating,
          analysis.score,
          analysis.price_per_m2_cents,
          analysis.market_avg_price_per_m2_cents,
          JSON.stringify(analysis.pros),
          JSON.stringify(analysis.cons),
          analysis.raw_response,
          analysis.model
        )
        .run();
    } catch (err) {
      console.error(`Analysis failed for property ${(row as any).id}:`, err);
    }
  }
}

async function markStaleProperties(env: Bindings) {
  await env.DB
    .prepare(
      `UPDATE properties
       SET is_active = 0, updated_at = datetime('now')
       WHERE is_active = 1
       AND last_seen_at < datetime('now', '-7 days')`
    )
    .run();
}
