import { z } from "zod";

export const operationSchema = z.enum(["rent", "buy"]);
export type Operation = z.infer<typeof operationSchema>;

export const propertyTypeSchema = z.enum([
  "apartment",
  "house",
  "room",
  "land",
  "commercial",
]);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

export const conditionSchema = z.enum([
  "new",
  "good",
  "renovation_needed",
  "under_construction",
]);
export type Condition = z.infer<typeof conditionSchema>;

export const providerNameSchema = z.enum([
  "idealista",
  "remax",
  "imovirtual",
  "casasapo",
  "custojusto",
]);
export type ProviderName = z.infer<typeof providerNameSchema>;

export const propertySchema = z.object({
  id: z.string(),
  external_id: z.string(),
  provider: providerNameSchema,
  url: z.string().url(),
  title: z.string(),
  description: z.string().nullable(),
  operation: operationSchema,
  property_type: propertyTypeSchema,
  price_cents: z.number().int().positive(),
  price_period: z.enum(["month"]).nullable(),
  area_m2: z.number().positive().nullable(),
  rooms: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  floor: z.string().nullable(),
  has_elevator: z.boolean(),
  has_parking: z.boolean(),
  has_terrace: z.boolean(),
  energy_rating: z.string().nullable(),
  condition: conditionSchema.nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  district: z.string().nullable(),
  municipality: z.string().nullable(),
  parish: z.string().nullable(),
  address: z.string().nullable(),
  images: z.array(z.string()),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Property = z.infer<typeof propertySchema>;

export const propertyInsertSchema = propertySchema.omit({
  id: true,
  first_seen_at: true,
  last_seen_at: true,
  is_active: true,
  created_at: true,
  updated_at: true,
});

export type PropertyInsert = z.infer<typeof propertyInsertSchema>;

export const propertyFiltersSchema = z.object({
  operation: operationSchema.optional(),
  property_type: propertyTypeSchema.optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  min_area: z.coerce.number().optional(),
  max_area: z.coerce.number().optional(),
  min_rooms: z.coerce.number().int().optional(),
  max_rooms: z.coerce.number().int().optional(),
  district: z.string().optional(),
  municipality: z.string().optional(),
  parish: z.string().optional(),
  provider: providerNameSchema.optional(),
  sort_by: z
    .enum(["price", "area", "created_at", "score"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type PropertyFilters = z.infer<typeof propertyFiltersSchema>;
