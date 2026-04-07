import { z } from "zod";

export const ratingSchema = z.enum([
  "great_deal",
  "good",
  "fair",
  "overpriced",
  "unknown",
]);
export type Rating = z.infer<typeof ratingSchema>;

export const analysisSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  summary: z.string(),
  rating: ratingSchema,
  score: z.number().int().min(1).max(100).nullable(),
  price_per_m2_cents: z.number().int().nullable(),
  market_avg_price_per_m2_cents: z.number().int().nullable(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  model: z.string(),
  created_at: z.string(),
});

export type Analysis = z.infer<typeof analysisSchema>;

export const aiResponseSchema = z.object({
  summary: z.string(),
  rating: ratingSchema,
  score: z.number().int().min(1).max(100),
  market_avg_price_per_m2: z.number().positive(),
  pros: z.array(z.string()).min(1).max(5),
  cons: z.array(z.string()).min(1).max(5),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;
