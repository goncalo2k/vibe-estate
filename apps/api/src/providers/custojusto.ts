import type { PropertyInsert, ProviderSearchParams } from "@property-agg/shared";
import type { PropertyProvider, ProviderResult } from "./interface.js";

interface CustoJustoItem {
  userID: string;
  listID: string;
  title: string;
  category: string;
  listTime: string;
  name: string;
  companyAd: boolean;
  imageFullURL: string;
  imageCount: number;
  type: string; // "sell" | "let"
  price: number;
  url: string;
  locationNames: {
    district: string;
    county: string;
    parish: string;
  };
  categoryName: string;
}

interface CustoJustoNextData {
  props?: {
    pageProps?: {
      listItems?: CustoJustoItem[];
      queryData?: {
        structure: string;
      };
    };
  };
}

export class CustoJustoProvider implements PropertyProvider {
  readonly name = "custojusto";
  readonly type = "scraper" as const;

  private baseUrl = "https://www.custojusto.pt";

  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    const district = params.districts?.[0];
    const locationPath = district
      ? `/${this.normalizeLocation(district)}`
      : "/portugal";
    const categoryPath = this.mapCategoryPath(params.propertyTypes);

    const url = new URL(
      `${locationPath}/imobiliario${categoryPath}`,
      this.baseUrl
    );

    // CustoJusto uses query params for filters
    if (params.minPrice) url.searchParams.set("pe", String(params.minPrice));
    if (params.maxPrice) url.searchParams.set("ps", String(params.maxPrice));
    if (params.minArea) url.searchParams.set("me", String(params.minArea));
    if (params.maxArea) url.searchParams.set("ms", String(params.maxArea));
    if (params.minRooms) url.searchParams.set("rs", String(params.minRooms));
    if (params.page && params.page > 1) url.searchParams.set("o", String(params.page));

    // sp=1 for let (rent), sp=2 for sell (buy)
    if (params.operation === "rent") {
      url.searchParams.set("sp", "1");
    } else {
      url.searchParams.set("sp", "2");
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`CustoJusto fetch failed: ${response.status}`);
    }

    const html = await response.text();
    return this.parseNextData(html, params);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  private parseNextData(html: string, params: ProviderSearchParams): ProviderResult {
    // Try multiple regex patterns for __NEXT_DATA__
    const match =
      html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/) ||
      html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);

    if (!match) {
      console.error("CustoJusto: __NEXT_DATA__ not found in response (" + html.length + " chars)");
      return { properties: [], totalResults: 0, hasMorePages: false, currentPage: params.page ?? 1 };
    }

    try {
      const data = JSON.parse(match[1]) as CustoJustoNextData;
      const items = data.props?.pageProps?.listItems || [];

      // Don't filter by type — include all items. CustoJusto mixes types on the same page.
      const properties = items
        .map((item) => this.mapItem(item, params))
        .filter((p): p is PropertyInsert => p !== null);

      console.log(`CustoJusto: parsed ${properties.length} properties from ${items.length} items`);

      return {
        properties,
        totalResults: items.length,
        hasMorePages: items.length >= 40,
        currentPage: params.page ?? 1,
      };
    } catch (err) {
      console.error("CustoJusto: failed to parse __NEXT_DATA__:", err);
      return { properties: [], totalResults: 0, hasMorePages: false, currentPage: params.page ?? 1 };
    }
  }

  private mapItem(
    item: CustoJustoItem,
    params: ProviderSearchParams
  ): PropertyInsert | null {
    if (!item.price || !item.listID) return null;

    const rooms = this.parseRooms(item.title);
    const fullUrl = item.url.startsWith("http")
      ? item.url
      : `${this.baseUrl}${item.url}`;

    return {
      external_id: item.listID,
      provider: "custojusto",
      url: fullUrl,
      title: item.title,
      description: null,
      operation: params.operation,
      property_type: this.mapPropertyType(item.categoryName),
      price_cents: Math.round(item.price * 100),
      price_period: params.operation === "rent" ? "month" : null,
      area_m2: null, // Not available in listing data
      rooms,
      bathrooms: null,
      floor: null,
      has_elevator: false,
      has_parking: false,
      has_terrace: false,
      energy_rating: null,
      condition: null,
      latitude: null,
      longitude: null,
      district: item.locationNames?.district || params.districts?.[0] || null,
      municipality: item.locationNames?.county || null,
      parish: item.locationNames?.parish || null,
      address: null,
      images: item.imageFullURL ? [item.imageFullURL] : [],
    };
  }

  private parseRooms(title: string): number | null {
    const match = title.match(/\bT(\d+)\b/i);
    return match ? parseInt(match[1], 10) : null;
  }

  private mapPropertyType(
    categoryName?: string
  ): "apartment" | "house" | "room" | "land" | "commercial" {
    if (!categoryName) return "apartment";
    const lower = categoryName.toLowerCase();
    if (lower.includes("apartamento")) return "apartment";
    if (lower.includes("moradia") || lower.includes("quintas")) return "house";
    if (lower.includes("quarto")) return "room";
    if (lower.includes("terreno")) return "land";
    if (lower.includes("escritório") || lower.includes("loja") || lower.includes("armazén")) return "commercial";
    return "apartment";
  }

  private mapCategoryPath(types?: string[]): string {
    if (!types || types.length === 0) return "/apartamentos";
    const map: Record<string, string> = {
      apartment: "/apartamentos",
      house: "/moradias",
      room: "/quartos",
      land: "/terrenos-quintas",
      commercial: "/escritorios",
    };
    return map[types[0]] || "/apartamentos";
  }

  private normalizeLocation(location: string): string {
    return location
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
  }
}
