import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { propertyFiltersSchema } from "@property-agg/shared";
import type { AppEnv } from "../bindings.js";
import { type PropertyRow, rowToProperty, rowToAnalysis, type AnalysisRow } from "../db/queries.js";

export const propertyRoutes = new Hono<AppEnv>()
  .get("/locations", async (c) => {
    const db = c.env.DB;
    const district = c.req.query("district");
    const municipality = c.req.query("municipality");

    if (municipality && district) {
      const rows = await db
        .prepare("SELECT DISTINCT parish FROM properties WHERE is_active = 1 AND district = ? AND municipality = ? AND parish IS NOT NULL ORDER BY parish")
        .bind(district, municipality)
        .all<{ parish: string }>();
      return c.json({ parishes: rows.results.map((r) => r.parish) });
    }

    if (district) {
      const rows = await db
        .prepare("SELECT DISTINCT municipality FROM properties WHERE is_active = 1 AND district = ? AND municipality IS NOT NULL ORDER BY municipality")
        .bind(district)
        .all<{ municipality: string }>();
      return c.json({ municipalities: rows.results.map((r) => r.municipality) });
    }

    return c.json({ municipalities: [], parishes: [] });
  })
  .get("/", zValidator("query", propertyFiltersSchema), async (c) => {
    const filters = c.req.valid("query");
    const db = c.env.DB;

    const conditions: string[] = ["p.is_active = 1"];
    const params: unknown[] = [];

    if (filters.operation) {
      conditions.push("p.operation = ?");
      params.push(filters.operation);
    }
    if (filters.property_type) {
      conditions.push("p.property_type = ?");
      params.push(filters.property_type);
    }
    if (filters.min_price !== undefined) {
      conditions.push("p.price_cents >= ?");
      params.push(filters.min_price * 100);
    }
    if (filters.max_price !== undefined) {
      conditions.push("p.price_cents <= ?");
      params.push(filters.max_price * 100);
    }
    if (filters.min_area !== undefined) {
      conditions.push("p.area_m2 >= ?");
      params.push(filters.min_area);
    }
    if (filters.max_area !== undefined) {
      conditions.push("p.area_m2 <= ?");
      params.push(filters.max_area);
    }
    if (filters.min_rooms !== undefined) {
      conditions.push("p.rooms >= ?");
      params.push(filters.min_rooms);
    }
    if (filters.max_rooms !== undefined) {
      conditions.push("p.rooms <= ?");
      params.push(filters.max_rooms);
    }
    if (filters.district) {
      conditions.push("p.district = ?");
      params.push(filters.district);
    }
    if (filters.municipality) {
      conditions.push("p.municipality = ?");
      params.push(filters.municipality);
    }
    if (filters.parish) {
      conditions.push("p.parish = ?");
      params.push(filters.parish);
    }
    if (filters.provider) {
      conditions.push("p.provider = ?");
      params.push(filters.provider);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortColumn =
      filters.sort_by === "price"
        ? "p.price_cents"
        : filters.sort_by === "area"
          ? "p.area_m2"
          : filters.sort_by === "score"
            ? "a.score"
            : "p.created_at";
    const sortDir = filters.sort_order === "asc" ? "ASC" : "DESC";
    const offset = (filters.page - 1) * filters.limit;

    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM properties p ${where}`)
      .bind(...params)
      .first<{ total: number }>();

    const rows = await db
      .prepare(
        `SELECT p.*, a.score FROM properties p
         LEFT JOIN analyses a ON a.property_id = p.id
         ${where}
         ORDER BY ${sortColumn} ${sortDir}
         LIMIT ? OFFSET ?`
      )
      .bind(...params, filters.limit, offset)
      .all<PropertyRow & { score: number | null }>();

    const properties = rows.results.map((row: PropertyRow & { score: number | null }) => rowToProperty(row));

    return c.json({
      data: properties,
      total: countResult?.total ?? 0,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil((countResult?.total ?? 0) / filters.limit),
    });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    const row = await db
      .prepare("SELECT * FROM properties WHERE id = ?")
      .bind(id)
      .first<PropertyRow>();

    if (!row) {
      return c.json({ error: "Property not found" }, 404);
    }

    const analysisRow = await db
      .prepare("SELECT * FROM analyses WHERE property_id = ?")
      .bind(id)
      .first<AnalysisRow>();

    return c.json({
      data: {
        ...rowToProperty(row),
        analysis: analysisRow ? rowToAnalysis(analysisRow) : null,
      },
    });
  });
