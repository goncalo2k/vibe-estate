import type { PropertyInsert } from "@property-agg/shared";

export function generateId(): string {
  return crypto.randomUUID();
}

/** Coerce a value to a D1-bindable primitive. Objects get stringified. */
function bind(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return String(v);
}

// --- Properties ---

export async function upsertProperty(
  db: D1Database,
  property: PropertyInsert
): Promise<{ id: string; isNew: boolean }> {
  const existing = await db
    .prepare(
      "SELECT id FROM properties WHERE provider = ? AND external_id = ?"
    )
    .bind(property.provider, property.external_id)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE properties SET
          title = ?, description = ?, price_cents = ?, price_period = ?,
          area_m2 = ?, rooms = ?, bathrooms = ?, floor = ?,
          has_elevator = ?, has_parking = ?, has_terrace = ?,
          energy_rating = ?, condition = ?,
          latitude = ?, longitude = ?,
          district = ?, municipality = ?, parish = ?, address = ?,
          images = ?, last_seen_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(
        bind(property.title),
        bind(property.description),
        bind(property.price_cents),
        bind(property.price_period),
        bind(property.area_m2),
        bind(property.rooms),
        bind(property.bathrooms),
        bind(property.floor),
        property.has_elevator ? 1 : 0,
        property.has_parking ? 1 : 0,
        property.has_terrace ? 1 : 0,
        bind(property.energy_rating),
        bind(property.condition),
        bind(property.latitude),
        bind(property.longitude),
        bind(property.district),
        bind(property.municipality),
        bind(property.parish),
        bind(property.address),
        JSON.stringify(property.images),
        existing.id
      )
      .run();

    return { id: existing.id, isNew: false };
  }

  const id = generateId();
  await db
    .prepare(
      `INSERT INTO properties (
        id, external_id, provider, url, title, description, operation, property_type,
        price_cents, price_period, area_m2, rooms, bathrooms, floor,
        has_elevator, has_parking, has_terrace,
        energy_rating, condition,
        latitude, longitude,
        district, municipality, parish, address,
        images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      bind(property.external_id),
      bind(property.provider),
      bind(property.url),
      bind(property.title),
      bind(property.description),
      bind(property.operation),
      bind(property.property_type),
      bind(property.price_cents),
      bind(property.price_period),
      bind(property.area_m2),
      bind(property.rooms),
      bind(property.bathrooms),
      bind(property.floor),
      property.has_elevator ? 1 : 0,
      property.has_parking ? 1 : 0,
      property.has_terrace ? 1 : 0,
      bind(property.energy_rating),
      bind(property.condition),
      bind(property.latitude),
      bind(property.longitude),
      bind(property.district),
      bind(property.municipality),
      bind(property.parish),
      bind(property.address),
      JSON.stringify(property.images)
    )
    .run();

  return { id, isNew: true };
}

export interface PropertyRow {
  id: string;
  external_id: string;
  provider: string;
  url: string;
  title: string;
  description: string | null;
  operation: string;
  property_type: string;
  price_cents: number;
  price_period: string | null;
  area_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  has_elevator: number;
  has_parking: number;
  has_terrace: number;
  energy_rating: string | null;
  condition: string | null;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  municipality: string | null;
  parish: string | null;
  address: string | null;
  images: string;
  first_seen_at: string;
  last_seen_at: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function rowToProperty(row: PropertyRow) {
  return {
    ...row,
    has_elevator: row.has_elevator === 1,
    has_parking: row.has_parking === 1,
    has_terrace: row.has_terrace === 1,
    is_active: row.is_active === 1,
    images: JSON.parse(row.images) as string[],
  };
}

export interface AnalysisRow {
  id: string;
  property_id: string;
  summary: string;
  rating: string;
  score: number | null;
  price_per_m2_cents: number | null;
  market_avg_price_per_m2_cents: number | null;
  pros: string;
  cons: string;
  raw_response: string | null;
  model: string;
  created_at: string;
}

export function rowToAnalysis(row: AnalysisRow) {
  return {
    ...row,
    pros: JSON.parse(row.pros) as string[],
    cons: JSON.parse(row.cons) as string[],
  };
}

export interface SearchRow {
  id: string;
  name: string;
  operation: string;
  property_types: string | null;
  min_price_cents: number | null;
  max_price_cents: number | null;
  min_area_m2: number | null;
  max_area_m2: number | null;
  min_rooms: number | null;
  max_rooms: number | null;
  districts: string | null;
  municipalities: string | null;
  parishes: string | null;
  providers: string | null;
  notify_email: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function rowToSearch(row: SearchRow) {
  return {
    ...row,
    property_types: row.property_types ? JSON.parse(row.property_types) : null,
    districts: row.districts ? JSON.parse(row.districts) : null,
    municipalities: row.municipalities ? JSON.parse(row.municipalities) : null,
    parishes: row.parishes ? JSON.parse(row.parishes) : null,
    providers: row.providers ? JSON.parse(row.providers) : null,
    is_active: row.is_active === 1,
  };
}
