import { z } from "zod";
import { operationSchema, propertyTypeSchema } from "./property.js";

export const providerSearchParamsSchema = z.object({
  operation: operationSchema,
  propertyTypes: z.array(propertyTypeSchema).optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minArea: z.number().positive().optional(),
  maxArea: z.number().positive().optional(),
  minRooms: z.number().int().nonnegative().optional(),
  maxRooms: z.number().int().positive().optional(),
  districts: z.array(z.string()).optional(),
  municipalities: z.array(z.string()).optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(50).optional().default(20),
});

export type ProviderSearchParams = z.infer<typeof providerSearchParamsSchema>;
