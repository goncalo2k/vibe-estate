import { z } from "zod";
import { operationSchema, propertyTypeSchema, providerNameSchema } from "./property.js";

export const searchCriteriaSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  operation: operationSchema,
  property_types: z.array(propertyTypeSchema).nullable(),
  min_price_cents: z.number().int().nonnegative().nullable(),
  max_price_cents: z.number().int().positive().nullable(),
  min_area_m2: z.number().positive().nullable(),
  max_area_m2: z.number().positive().nullable(),
  min_rooms: z.number().int().nonnegative().nullable(),
  max_rooms: z.number().int().positive().nullable(),
  districts: z.array(z.string()).nullable(),
  municipalities: z.array(z.string()).nullable(),
  parishes: z.array(z.string()).nullable(),
  providers: z.array(providerNameSchema).nullable(),
  notify_email: z.string().email().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SearchCriteria = z.infer<typeof searchCriteriaSchema>;

export const searchCreateSchema = searchCriteriaSchema.omit({
  id: true,
  is_active: true,
  created_at: true,
  updated_at: true,
});

export type SearchCreate = z.infer<typeof searchCreateSchema>;

export const searchUpdateSchema = searchCreateSchema.partial();
export type SearchUpdate = z.infer<typeof searchUpdateSchema>;
