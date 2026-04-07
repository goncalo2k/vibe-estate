import { parse } from "node-html-parser";
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
  readonly type: "api" | "scraper";

  private token: string | null = null;
  private tokenExpiry = 0;
  private apiKey: string | null;
  private apiSecret: string | null;
  private baseUrl = "https://www.idealista.pt";

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || null;
    this.apiSecret = apiSecret || null;
    this.type = this.apiKey && this.apiSecret ? "api" : "scraper";
  }

  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    if (this.apiKey && this.apiSecret) {
      return this.searchApi(params);
    }
    return this.searchScrape(params);
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.apiKey && this.apiSecret) {
        await this.ensureToken();
        return true;
      }
      const response = await fetch(this.baseUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  // --- API mode ---

  private async searchApi(params: ProviderSearchParams): Promise<ProviderResult> {
    await this.ensureToken();

    const searchParams = new URLSearchParams({
      operation: params.operation === "rent" ? "rent" : "sale",
      country: "pt",
      propertyType: this.mapPropertyTypes(params.propertyTypes),
      center: "38.7223,-9.1393",
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
      properties: data.elementList.map((item) => this.mapApiListing(item, params.operation)),
      totalResults: data.total,
      hasMorePages: data.actualPage < data.totalPages,
      currentPage: data.actualPage,
    };
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
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
  }

  // --- Scraper mode ---

  private async searchScrape(params: ProviderSearchParams): Promise<ProviderResult> {
    const operationPath = params.operation === "rent" ? "/arrendar" : "/comprar";
    const typePath = this.mapPropertyTypePath(params.propertyTypes);
    const locationPath = params.districts?.length
      ? `/${this.normalizeLocation(params.districts[0])}`
      : "/lisboa";

    const url = new URL(
      `${operationPath}${typePath}${locationPath}/`,
      this.baseUrl
    );

    if (params.minPrice) url.searchParams.set("minPrice", String(params.minPrice));
    if (params.maxPrice) url.searchParams.set("maxPrice", String(params.maxPrice));
    if (params.minArea) url.searchParams.set("minSize", String(params.minArea));
    if (params.maxArea) url.searchParams.set("maxSize", String(params.maxArea));
    if (params.minRooms) url.searchParams.set("minRooms", String(params.minRooms));
    if (params.maxRooms) url.searchParams.set("maxRooms", String(params.maxRooms));
    if (params.page && params.page > 1) url.searchParams.set("pagina", String(params.page));

    url.searchParams.set("ordenado-por", "fecha-publicacion-desc");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Idealista scrape failed: ${response.status}`);
    }

    const html = await response.text();
    return this.parseHtml(html, params);
  }

  private parseHtml(html: string, params: ProviderSearchParams): ProviderResult {
    const root = parse(html);
    const properties: PropertyInsert[] = [];

    const cards = root.querySelectorAll("article.item");

    for (const card of cards) {
      try {
        const link = card.querySelector("a.item-link");
        const href = link?.getAttribute("href") || "";
        if (!href) continue;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;

        const titleEl = card.querySelector("a.item-link");
        const priceEl = card.querySelector(".item-price");
        const detailNodes = card.querySelectorAll(".item-detail span");
        const imgEl = card.querySelector("img");
        const parkingEl = card.querySelector(".item-parking");

        const title = titleEl?.text.trim() || "Idealista Property";
        const price = this.parsePrice(priceEl?.text.trim());
        if (!price) continue;

        const externalId = this.extractId(href);

        let rooms: number | null = null;
        let area: number | null = null;
        let floor: string | null = null;

        for (const detail of detailNodes) {
          const text = detail.text.trim();
          if (text.includes("m²")) {
            area = this.parseArea(text);
          } else if (/\d+\s*(quarto|hab|T\d)/i.test(text)) {
            rooms = this.parseNumber(text);
          } else if (/\d+[ºª°]\s*(andar)?/i.test(text) || /rés-do-chão|cave|sótão/i.test(text)) {
            floor = text;
          }
        }

        const imgSrc = imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";

        properties.push({
          external_id: externalId,
          provider: "idealista",
          url: fullUrl,
          title,
          description: null,
          operation: params.operation,
          property_type: "apartment",
          price_cents: price,
          price_period: params.operation === "rent" ? "month" : null,
          area_m2: area,
          rooms,
          bathrooms: null,
          floor,
          has_elevator: false,
          has_parking: !!parkingEl,
          has_terrace: false,
          energy_rating: null,
          condition: null,
          latitude: null,
          longitude: null,
          district: params.districts?.[0] || null,
          municipality: null,
          parish: null,
          address: null,
          images: imgSrc ? [imgSrc] : [],
        });
      } catch (err) {
        console.error("Failed to parse Idealista card:", err);
      }
    }

    const totalEl = root.querySelector(".listing-title span, .breadcrumb-subitems");
    const totalResults = this.parseNumber(totalEl?.text.trim()) || properties.length;

    const nextPage = root.querySelector(".pagination .next a");

    return {
      properties,
      totalResults,
      hasMorePages: !!nextPage,
      currentPage: params.page ?? 1,
    };
  }

  // --- Mapping helpers ---

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

  private mapPropertyTypePath(types?: string[]): string {
    if (!types || types.length === 0) return "/casas";
    const map: Record<string, string> = {
      apartment: "/apartamentos",
      house: "/moradias",
      room: "/quartos",
      land: "/terrenos",
      commercial: "/escritorios",
    };
    return map[types[0]] || "/casas";
  }

  private mapApiListing(item: IdealistaListing, operation: string): PropertyInsert {
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

  private normalizeLocation(location: string): string {
    return location
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
  }

  private parsePrice(text?: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.round(num * 100);
  }

  private parseArea(text?: string): number | null {
    if (!text) return null;
    const match = text.match(/([\d.,]+)\s*m/);
    return match ? parseFloat(match[1].replace(",", ".")) || null : null;
  }

  private parseNumber(text?: string): number | null {
    if (!text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractId(href: string): string {
    const match = href.match(/(\d{5,})/);
    return match ? match[1] : href.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50);
  }
}
