import type { PropertyInsert, ProviderSearchParams } from "@property-agg/shared";

export interface ProviderResult {
  properties: PropertyInsert[];
  totalResults: number;
  hasMorePages: boolean;
  currentPage: number;
}

export interface PropertyProvider {
  readonly name: string;
  readonly type: "api" | "scraper";

  search(params: ProviderSearchParams): Promise<ProviderResult>;
  getDetails?(externalId: string): Promise<PropertyInsert | null>;
  healthCheck(): Promise<boolean>;
}
