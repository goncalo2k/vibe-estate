import type { PropertyInsert, ProviderSearchParams } from "@property-agg/shared";
import type { PropertyProvider, ProviderResult } from "./interface.js";

interface IdealistaListing {
  propertyCode: string;
  url: string;
  title: string;
  description: string;
  price: number;
  priceInfo?: { price: { amount: number } };
  operation: string;
  propertyType: string;
  size: number;
  rooms: number;
  bathrooms: number;
  floor: string;
  hasLift: boolean;
  hasParkingSpace: boolean;
  terrace: boolean;
  energyCertification?: { type: string };
  status: string;
  latitude: number;
  longitude: number;
  district: string;
  municipality: string;
  neighborhood: string;
  address: string;
  thumbnail: string;
  images?: string[];
}

interface IdealistaResponse {
  elementList: IdealistaListing[];
  total: number;
  totalPages: number;
  actualPage: number;
}

export class IdealistaProvider implements PropertyProvider {
  readonly name = "idealista";
  readonly type = "api" as const;

  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(
    private apiKey: string,
    private apiSecret: string
  ) {}

  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    await this.ensureToken();

    const searchParams = new URLSearchParams({
      operation: params.operation === "rent" ? "rent" : "sale",
      country: "pt",
      propertyType: this.mapPropertyTypes(params.propertyTypes),
      center: "38.7223,-9.1393", // Default: Lisbon center
      distance: "15000",
      numPage: String(params.page ?? 1),
      maxItems: String(params.pageSize ?? 20),
      order: "publicationDate",
      sort: "desc",
      language: "pt",
    });

    if (params.minPrice) searchParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) searchParams.set("maxPrice", String(params.maxPrice));
    if (params.minArea) searchParams.set("minSize", String(params.minArea));
    if (params.maxArea) searchParams.set("maxSize", String(params.maxArea));
    if (params.minRooms) searchParams.set("minRooms", String(params.minRooms));
    if (params.maxRooms) searchParams.set("maxRooms", String(params.maxRooms));

    const response = await fetch(
      `https://api.idealista.com/3.5/pt/search?${searchParams.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Idealista API error: ${response.status}`);
    }

    const data = (await response.json()) as IdealistaResponse;

    return {
      properties: data.elementList.map((item) => this.mapListing(item, params.operation)),
      totalResults: data.total,
      hasMorePages: data.actualPage < data.totalPages,
      currentPage: data.actualPage,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureToken();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureToken(): Promise<void> {
    if (this.token && Date.now() < this.tokenExpiry) return;

    const credentials = btoa(`${this.apiKey}:${this.apiSecret}`);
    const response = await fetch("https://api.idealista.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Idealista OAuth failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000; // Refresh 1 min early
  }

  private mapPropertyTypes(types?: string[]): string {
    if (!types || types.length === 0) return "homes";
    const map: Record<string, string> = {
      apartment: "flats",
      house: "chalets",
      room: "bedrooms",
      land: "premises",
      commercial: "offices",
    };
    return types.map((t) => map[t] || "homes").join(",");
  }

  private mapListing(item: IdealistaListing, operation: string): PropertyInsert {
    return {
      external_id: item.propertyCode,
      provider: "idealista",
      url: item.url.startsWith("http")
        ? item.url
        : `https://www.idealista.pt${item.url}`,
      title: item.title,
      description: item.description || null,
      operation: operation as "rent" | "buy",
      property_type: this.mapPropertyType(item.propertyType),
      price_cents: Math.round(item.price * 100),
      price_period: operation === "rent" ? "month" : null,
      area_m2: item.size || null,
      rooms: item.rooms ?? null,
      bathrooms: item.bathrooms ?? null,
      floor: item.floor || null,
      has_elevator: item.hasLift ?? false,
      has_parking: item.hasParkingSpace ?? false,
      has_terrace: item.terrace ?? false,
      energy_rating: item.energyCertification?.type || null,
      condition: this.mapCondition(item.status),
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      district: item.district || null,
      municipality: item.municipality || null,
      parish: item.neighborhood || null,
      address: item.address || null,
      images: item.images || (item.thumbnail ? [item.thumbnail] : []),
    };
  }

  private mapPropertyType(
    type: string
  ): "apartment" | "house" | "room" | "land" | "commercial" {
    const map: Record<string, "apartment" | "house" | "room" | "land" | "commercial"> = {
      flat: "apartment",
      apartment: "apartment",
      chalet: "house",
      house: "house",
      countryHouse: "house",
      bedroom: "room",
      premises: "commercial",
      office: "commercial",
      land: "land",
    };
    return map[type] || "apartment";
  }

  private mapCondition(
    status: string
  ): "new" | "good" | "renovation_needed" | "under_construction" | null {
    const map: Record<string, "new" | "good" | "renovation_needed" | "under_construction"> = {
      newdevelopment: "new",
      good: "good",
      renew: "renovation_needed",
    };
    return map[status] || null;
  }
}
