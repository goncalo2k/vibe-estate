// Cross-provider deduplication (V1: best-effort, non-blocking)
// For V1 we rely on the UNIQUE(provider, external_id) constraint
// to prevent duplicates within a single provider.
// Cross-provider matching can be added later by comparing
// (district, municipality, rooms, area_m2 ± 5%, price_cents ± 10%).
