import { parse } from "node-html-parser";
import type { PropertyInsert, ProviderSearchParams } from "@property-agg/shared";
import type { PropertyProvider, ProviderResult } from "./interface.js";

interface ImovirtualNextData {
  props?: {
    pageProps?: {
      data?: {
        searchAds?: {
          items?: ImovirtualItem[];
          pagination?: { totalResults: number; totalPages: number; page: number };
        };
      };
    };
  };
}

interface ImovirtualItem {
  id: number;
  title: string;
  slug: string;
  estate: string;
  transaction: string;
  shortDescription?: string;
  totalPrice?: { value: number; currency: string };
  rentPrice?: { value: number; currency: string };
  areaInSquareMeters?: number;
  terrainAreaInSquareMeters?: number;
  roomsNumber?: string;
  floorNumber?: number;
  href?: string;
  location?: {
    address?: { street?: string | null; city?: { name: string }; province?: { name: string } };
    mapDetails?: { radius?: number };
    reverseGeocoding?: {
      locations?: Array<{
        id: string;
        fullName: string;
        name: string;
        locationLevel: string;
      }>;
    };
  };
  images?: Array<{ medium?: string; large?: string }>;
}

const ROOMS_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10,
};

export class ImovirtualProvider implements PropertyProvider {
  readonly name = "imovirtual";
  readonly type = "scraper" as const;

  private baseUrl = "https://www.imovirtual.com";

  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    const operationPath = params.operation === "rent" ? "/arrendar" : "/comprar";
    const typePath = this.mapPropertyTypePath(params.propertyTypes);
    const locationPath = params.districts?.length
      ? `/${this.normalizeLocation(params.districts[0])}`
      : "";

    const url = new URL(
      `${operationPath}${typePath}${locationPath}/`,
      this.baseUrl
    );

    if (params.minPrice)
      url.searchParams.set("search[filter_float_price:from]", String(params.minPrice));
    if (params.maxPrice)
      url.searchParams.set("search[filter_float_price:to]", String(params.maxPrice));
    if (params.minArea)
      url.searchParams.set("search[filter_float_m:from]", String(params.minArea));
    if (params.maxArea)
      url.searchParams.set("search[filter_float_m:to]", String(params.maxArea));
    if (params.minRooms)
      url.searchParams.set("search[filter_enum_rooms_num][0]", String(params.minRooms));
    if (params.page && params.page > 1)
      url.searchParams.set("page", String(params.page));

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
        "Accept-Language": "pt-PT,pt;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Imovirtual fetch failed: ${response.status}`);
    }

    const html = await response.text();

    // Try __NEXT_DATA__ first (most reliable)
    const nextDataResult = this.parseNextData(html, params);
    if (nextDataResult) return nextDataResult;

    // Fallback: parse HTML
    return this.parseHtml(html, params);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  private parseNextData(
    html: string,
    params: ProviderSearchParams
  ): ProviderResult | null {
    const match = html.match(
      /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
    );
    if (!match) return null;

    try {
      const data = JSON.parse(match[1]) as ImovirtualNextData;
      const searchAds = data.props?.pageProps?.data?.searchAds;
      if (!searchAds?.items) return null;

      const properties = searchAds.items
        .map((item) => this.mapItem(item, params))
        .filter((p): p is PropertyInsert => p !== null);

      return {
        properties,
        totalResults: searchAds.pagination?.totalResults ?? properties.length,
        hasMorePages:
          (searchAds.pagination?.page ?? 1) <
          (searchAds.pagination?.totalPages ?? 1),
        currentPage: searchAds.pagination?.page ?? 1,
      };
    } catch {
      return null;
    }
  }

  private parseHtml(
    html: string,
    params: ProviderSearchParams
  ): ProviderResult {
    const root = parse(html);
    const properties: PropertyInsert[] = [];

    const cards = root.querySelectorAll(
      '[data-cy="listing-item"], article.offer-item, .listing-item'
    );

    for (const card of cards) {
      try {
        const link = card.querySelector('a[href*="/anuncio/"], a[href*="/pt/"]');
        const href = link?.getAttribute("href") || "";
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;

        const titleEl = card.querySelector("h3, h2, .offer-item-title");
        const priceEl = card.querySelector('[data-cy="listing-item-price"], .offer-item-price');
        const areaEl = card.querySelector('[aria-label*="Área"], .offer-item-area');
        const roomsEl = card.querySelector('[aria-label*="Quartos"], .offer-item-rooms');
        const imgEl = card.querySelector("img");
        const locationEl = card.querySelector(".offer-item-location, [data-cy=\"listing-item-location\"]");

        const title = titleEl?.text.trim() || "Imovirtual Property";
        const price = this.parsePrice(priceEl?.text.trim());

        if (!price || !href) continue;

        const externalId = this.extractId(href);

        properties.push({
          external_id: externalId,
          provider: "imovirtual",
          url: fullUrl,
          title,
          description: null,
          operation: params.operation,
          property_type: "apartment",
          price_cents: price,
          price_period: params.operation === "rent" ? "month" : null,
          area_m2: this.parseArea(areaEl?.text.trim()),
          rooms: this.parseNumber(roomsEl?.text.trim()),
          bathrooms: null,
          floor: null,
          has_elevator: false,
          has_parking: false,
          has_terrace: false,
          energy_rating: null,
          condition: null,
          latitude: null,
          longitude: null,
          district: params.districts?.[0] || null,
          municipality: null,
          parish: null,
          address: locationEl?.text.trim() || null,
          images: imgEl
            ? [imgEl.getAttribute("src") || imgEl.getAttribute("data-src") || ""].filter(Boolean)
            : [],
        });
      } catch (err) {
        console.error("Failed to parse Imovirtual card:", err);
      }
    }

    return {
      properties,
      totalResults: properties.length,
      hasMorePages: properties.length >= (params.pageSize ?? 20),
      currentPage: params.page ?? 1,
    };
  }

  private mapItem(
    item: ImovirtualItem,
    params: ProviderSearchParams
  ): PropertyInsert | null {
    const price = item.totalPrice?.value ?? item.rentPrice?.value;
    if (!price) return null;

    const locations = item.location?.reverseGeocoding?.locations || [];
    const district = locations.find((l) => l.locationLevel === "district")?.name ?? null;
    const municipality = locations.find((l) => l.locationLevel === "council")?.name ?? null;
    const parish = locations.find((l) => l.locationLevel === "parish")?.name ?? null;

    const slug = item.slug || `${item.id}`;
    const url = `${this.baseUrl}/pt/anuncio/${slug}`;

    return {
      external_id: String(item.id),
      provider: "imovirtual",
      url,
      title: item.title,
      description: item.shortDescription || null,
      operation: params.operation,
      property_type: this.mapPropertyType(item.estate),
      price_cents: Math.round(price * 100),
      price_period: params.operation === "rent" ? "month" : null,
      area_m2: item.areaInSquareMeters || null,
      rooms: item.roomsNumber ? (ROOMS_MAP[item.roomsNumber] ?? null) : null,
      bathrooms: null,
      floor: item.floorNumber != null ? String(item.floorNumber) : null,
      has_elevator: false,
      has_parking: false,
      has_terrace: false,
      energy_rating: null,
      condition: null,
      latitude: null,
      longitude: null,
      district,
      municipality,
      parish,
      address: item.location?.address?.street || null,
      images: (item.images || [])
        .map((img) => img.large || img.medium || "")
        .filter(Boolean),
    };
  }

  private mapPropertyType(
    estate?: string
  ): "apartment" | "house" | "room" | "land" | "commercial" {
    if (!estate) return "apartment";
    const map: Record<string, "apartment" | "house" | "room" | "land" | "commercial"> = {
      FLAT: "apartment",
      APARTMENT: "apartment",
      HOUSE: "house",
      TERRAIN: "land",
      ROOM: "room",
      COMMERCIAL: "commercial",
      OFFICE: "commercial",
      GARAGE: "commercial",
    };
    return map[estate.toUpperCase()] || "apartment";
  }

  private mapPropertyTypePath(types?: string[]): string {
    if (!types || types.length === 0) return "";
    const map: Record<string, string> = {
      apartment: "/apartamento",
      house: "/moradia",
      room: "/quarto",
      land: "/terreno",
      commercial: "/comercial",
    };
    return map[types[0]] || "";
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
    const match = href.match(/ID(\d+)/i) || href.match(/(\d{5,})/);
    return match ? match[1] : href.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50);
  }
}
