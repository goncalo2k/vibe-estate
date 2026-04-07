import type { Bindings } from "../bindings.js";
import { createProviderRegistry } from "../providers/registry.js";
import { generateId, upsertProperty, type SearchRow } from "../db/queries.js";
import type { ProviderSearchParams } from "@property-agg/shared";

export async function runScrapeJob(env: Bindings): Promise<void> {
  const db = env.DB;
  const registry = createProviderRegistry(env);

  // Get all active searches
  const searches = await db
    .prepare("SELECT * FROM searches WHERE is_active = 1")
    .all<SearchRow>();

  if (!searches.results.length) {
    console.log("No active searches to scrape for");
    return;
  }

  for (const [providerName, provider] of registry) {
    const runId = generateId();

    await db
      .prepare(
        "INSERT INTO scrape_runs (id, provider, status) VALUES (?, ?, 'running')"
      )
      .bind(runId, providerName)
      .run();

    let totalFound = 0;
    let totalNew = 0;
    let totalUpdated = 0;

    try {
      for (const search of searches.results) {
        // Skip if this search excludes this provider
        const allowedProviders = search.providers
          ? (JSON.parse(search.providers) as string[])
          : null;
        if (allowedProviders && !allowedProviders.includes(providerName)) {
          continue;
        }

        const params: ProviderSearchParams = {
          operation: search.operation as "rent" | "buy",
          propertyTypes: search.property_types
            ? JSON.parse(search.property_types)
            : undefined,
          minPrice: search.min_price_cents
            ? search.min_price_cents / 100
            : undefined,
          maxPrice: search.max_price_cents
            ? search.max_price_cents / 100
            : undefined,
          minArea: search.min_area_m2 ?? undefined,
          maxArea: search.max_area_m2 ?? undefined,
          minRooms: search.min_rooms ?? undefined,
          maxRooms: search.max_rooms ?? undefined,
          districts: search.districts ? JSON.parse(search.districts) : undefined,
          municipalities: search.municipalities
            ? JSON.parse(search.municipalities)
            : undefined,
          page: 1,
          pageSize: 20,
        };

        try {
          // Fetch up to 3 pages per search per provider
          for (let page = 1; page <= 3; page++) {
            params.page = page;
            const result = await provider.search(params);
            totalFound += result.properties.length;

            for (const property of result.properties) {
              const { isNew } = await upsertProperty(db, property);
              if (isNew) totalNew++;
              else totalUpdated++;
            }

            if (!result.hasMorePages) break;
          }
        } catch (err) {
          console.error(
            `Provider ${providerName} failed for search ${search.id}:`,
            err
          );
        }
      }

      await db
        .prepare(
          `UPDATE scrape_runs SET
            status = 'completed',
            completed_at = datetime('now'),
            properties_found = ?,
            properties_new = ?,
            properties_updated = ?
          WHERE id = ?`
        )
        .bind(totalFound, totalNew, totalUpdated, runId)
        .run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db
        .prepare(
          `UPDATE scrape_runs SET
            status = 'failed',
            completed_at = datetime('now'),
            error_message = ?
          WHERE id = ?`
        )
        .bind(message, runId)
        .run();
    }
  }
}
