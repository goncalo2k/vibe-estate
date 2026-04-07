import { aiResponseSchema } from "@property-agg/shared";

interface PropertyForAnalysis {
  operation: string;
  property_type: string;
  title: string;
  description: string | null;
  price_cents: number;
  price_period: string | null;
  area_m2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  condition: string | null;
  energy_rating: string | null;
  district: string | null;
  municipality: string | null;
  parish: string | null;
}

interface AnalysisResult {
  summary: string;
  rating: string;
  score: number | null;
  price_per_m2_cents: number | null;
  market_avg_price_per_m2_cents: number | null;
  pros: string[];
  cons: string[];
  raw_response: string;
  model: string;
}

const MODEL = "claude-sonnet-4-20250514";

export async function analyzeProperty(
  property: PropertyForAnalysis,
  apiKey: string
): Promise<AnalysisResult> {
  const priceEuros = property.price_cents / 100;
  const pricePerM2 =
    property.area_m2 && property.area_m2 > 0
      ? Math.round(priceEuros / property.area_m2)
      : null;
  const priceSuffix = property.price_period === "month" ? "/month" : "";

  const prompt = `You are a Portuguese real estate market analyst. Analyze this property listing and provide your assessment.

Property:
- Operation: ${property.operation}
- Type: ${property.property_type}
- Location: ${[property.parish, property.municipality, property.district].filter(Boolean).join(", ")}
- Price: ${priceEuros.toLocaleString("pt-PT")}€${priceSuffix}
- Area: ${property.area_m2 ? `${property.area_m2} m²` : "N/A"}
- Price per m²: ${pricePerM2 ? `${pricePerM2}€` : "N/A"}
- Rooms: ${property.rooms ?? "N/A"}, Bathrooms: ${property.bathrooms ?? "N/A"}
- Condition: ${property.condition ?? "N/A"}
- Energy Rating: ${property.energy_rating ?? "N/A"}
- Title: ${property.title}
- Description: ${property.description ?? "N/A"}

Respond with valid JSON only, no markdown:
{
  "summary": "2-3 sentence analysis in English",
  "rating": "great_deal|good|fair|overpriced",
  "score": <1-100>,
  "market_avg_price_per_m2": <estimated market average €/m² for this area and type>,
  "pros": ["pro1", "pro2", ...up to 5],
  "cons": ["con1", "con2", ...up to 5]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const result = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = result.content[0].text;
  const parsed = aiResponseSchema.parse(JSON.parse(text));

  return {
    summary: parsed.summary,
    rating: parsed.rating,
    score: parsed.score,
    price_per_m2_cents: pricePerM2 ? pricePerM2 * 100 : null,
    market_avg_price_per_m2_cents: Math.round(parsed.market_avg_price_per_m2 * 100),
    pros: parsed.pros,
    cons: parsed.cons,
    raw_response: text,
    model: MODEL,
  };
}
