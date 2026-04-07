import { Hono } from "hono";
import type { AppEnv } from "../bindings.js";
import { type PropertyRow, type AnalysisRow, rowToAnalysis, rowToProperty, generateId } from "../db/queries.js";
import { analyzeProperty } from "../services/analysis.js";

export const analysisRoutes = new Hono<AppEnv>()
  .get("/properties/:id/analysis", async (c) => {
    const propertyId = c.req.param("id");
    const db = c.env.DB;

    const row = await db
      .prepare("SELECT * FROM analyses WHERE property_id = ?")
      .bind(propertyId)
      .first<AnalysisRow>();

    if (!row) {
      return c.json({ error: "Analysis not found" }, 404);
    }

    return c.json({ data: rowToAnalysis(row) });
  })
  .post("/properties/:id/analysis", async (c) => {
    const propertyId = c.req.param("id");
    const db = c.env.DB;

    const property = await db
      .prepare("SELECT * FROM properties WHERE id = ?")
      .bind(propertyId)
      .first<PropertyRow>();

    if (!property) {
      return c.json({ error: "Property not found" }, 404);
    }

    const existing = await db
      .prepare("SELECT * FROM analyses WHERE property_id = ?")
      .bind(propertyId)
      .first<AnalysisRow>();

    if (existing) {
      return c.json({ data: rowToAnalysis(existing) });
    }

    const analysis = await analyzeProperty(
      rowToProperty(property),
      {
        apiKey: c.env.LLM_API_KEY,
        baseUrl: c.env.LLM_BASE_URL,
        model: c.env.LLM_MODEL,
      }
    );

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
        propertyId,
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

    const row = await db
      .prepare("SELECT * FROM analyses WHERE id = ?")
      .bind(id)
      .first<AnalysisRow>();

    return c.json({ data: rowToAnalysis(row!) }, 201);
  });
