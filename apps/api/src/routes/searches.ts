import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { searchCreateSchema, searchUpdateSchema } from "@property-agg/shared";
import type { AppEnv } from "../bindings.js";
import { generateId, type SearchRow, rowToSearch } from "../db/queries.js";

export const searchRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = c.env.DB;
    const rows = await db
      .prepare("SELECT * FROM searches WHERE is_active = 1 ORDER BY created_at DESC")
      .all<SearchRow>();
    return c.json({ data: rows.results.map(rowToSearch) });
  })
  .post("/", zValidator("json", searchCreateSchema), async (c) => {
    const data = c.req.valid("json");
    const db = c.env.DB;
    const id = generateId();

    await db
      .prepare(
        `INSERT INTO searches (
          id, name, operation, property_types,
          min_price_cents, max_price_cents, min_area_m2, max_area_m2,
          min_rooms, max_rooms, districts, municipalities, parishes,
          providers, notify_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.operation,
        data.property_types ? JSON.stringify(data.property_types) : null,
        data.min_price_cents,
        data.max_price_cents,
        data.min_area_m2,
        data.max_area_m2,
        data.min_rooms,
        data.max_rooms,
        data.districts ? JSON.stringify(data.districts) : null,
        data.municipalities ? JSON.stringify(data.municipalities) : null,
        data.parishes ? JSON.stringify(data.parishes) : null,
        data.providers ? JSON.stringify(data.providers) : null,
        data.notify_email
      )
      .run();

    const row = await db
      .prepare("SELECT * FROM searches WHERE id = ?")
      .bind(id)
      .first<SearchRow>();

    return c.json({ data: rowToSearch(row!) }, 201);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    const row = await db
      .prepare("SELECT * FROM searches WHERE id = ? AND is_active = 1")
      .bind(id)
      .first<SearchRow>();

    if (!row) {
      return c.json({ error: "Search not found" }, 404);
    }
    return c.json({ data: rowToSearch(row) });
  })
  .put("/:id", zValidator("json", searchUpdateSchema), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const db = c.env.DB;

    const existing = await db
      .prepare("SELECT * FROM searches WHERE id = ? AND is_active = 1")
      .bind(id)
      .first<SearchRow>();

    if (!existing) {
      return c.json({ error: "Search not found" }, 404);
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.operation !== undefined) { fields.push("operation = ?"); values.push(data.operation); }
    if (data.property_types !== undefined) {
      fields.push("property_types = ?");
      values.push(data.property_types ? JSON.stringify(data.property_types) : null);
    }
    if (data.min_price_cents !== undefined) { fields.push("min_price_cents = ?"); values.push(data.min_price_cents); }
    if (data.max_price_cents !== undefined) { fields.push("max_price_cents = ?"); values.push(data.max_price_cents); }
    if (data.min_area_m2 !== undefined) { fields.push("min_area_m2 = ?"); values.push(data.min_area_m2); }
    if (data.max_area_m2 !== undefined) { fields.push("max_area_m2 = ?"); values.push(data.max_area_m2); }
    if (data.min_rooms !== undefined) { fields.push("min_rooms = ?"); values.push(data.min_rooms); }
    if (data.max_rooms !== undefined) { fields.push("max_rooms = ?"); values.push(data.max_rooms); }
    if (data.districts !== undefined) {
      fields.push("districts = ?");
      values.push(data.districts ? JSON.stringify(data.districts) : null);
    }
    if (data.municipalities !== undefined) {
      fields.push("municipalities = ?");
      values.push(data.municipalities ? JSON.stringify(data.municipalities) : null);
    }
    if (data.parishes !== undefined) {
      fields.push("parishes = ?");
      values.push(data.parishes ? JSON.stringify(data.parishes) : null);
    }
    if (data.providers !== undefined) {
      fields.push("providers = ?");
      values.push(data.providers ? JSON.stringify(data.providers) : null);
    }
    if (data.notify_email !== undefined) { fields.push("notify_email = ?"); values.push(data.notify_email); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      await db
        .prepare(`UPDATE searches SET ${fields.join(", ")} WHERE id = ?`)
        .bind(...values, id)
        .run();
    }

    const updated = await db
      .prepare("SELECT * FROM searches WHERE id = ?")
      .bind(id)
      .first<SearchRow>();

    return c.json({ data: rowToSearch(updated!) });
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    await db
      .prepare("UPDATE searches SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();

    return c.json({ success: true });
  });
