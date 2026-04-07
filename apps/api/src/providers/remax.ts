import { parse } from "node-html-parser";
import type { PropertyInsert, ProviderSearchParams } from "@property-agg/shared";
import type { PropertyProvider, ProviderResult } from "./interface.js";

export class RemaxProvider implements PropertyProvider {
  readonly name = "remax";
  readonly type = "scraper" as const;

  private baseUrl = "https://www.remax.pt";

  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    const path = params.operation === "rent" ? "/arrendar" : "/comprar";
    const url = new URL(path, this.baseUrl);

    if (params.minPrice) url.searchParams.set("min-price", String(params.minPrice));
    if (params.maxPrice) url.searchParams.set("max-price", String(params.maxPrice));
    if (params.minRooms) url.searchParams.set("bedrooms", String(params.minRooms));
    if (params.minArea) url.searchParams.set("min-area", String(params.minArea));
    if (params.maxArea) url.searchParams.set("max-area", String(params.maxArea));
    if (params.page && params.page > 1) url.searchParams.set("page", String(params.page));

    if (params.districts?.length) {
      url.searchParams.set("q", params.districts[0]);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
        "Accept-Language": "pt-PT,pt;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`RE/MAX fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const root = parse(html);
    const properties: PropertyInsert[] = [];

    // RE/MAX uses listing cards with data attributes or structured HTML
    // The exact selectors may need adjustment based on current site structure
    const cards = root.querySelectorAll(
      '[data-testid="listing-card"], .listing-card, .property-card, article.card'
    );

    for (const card of cards) {
      try {
        const link = card.querySelector("a[href]");
        const href = link?.getAttribute("href") || "";
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;

        const titleEl = card.querySelector("h2, h3, .listing-title, .card-title");
        const priceEl = card.querySelector(
          '.listing-price, .price, [data-testid="price"]'
        );
        const areaEl = card.querySelector(
          '.listing-area, .area, [data-testid="area"]'
        );
        const roomsEl = card.querySelector(
          '.listing-rooms, .rooms, [data-testid="bedrooms"]'
        );
        const imageEl = card.querySelector("img");
        const locationEl = card.querySelector(
          ".listing-location, .location, .address"
        );

        const title = titleEl?.text.trim() || "RE/MAX Property";
        const priceText = priceEl?.text.trim() || "";
        const price = this.parsePrice(priceText);

        if (!price || !href) continue;

        const externalId = this.extractId(href);

        properties.push({
          external_id: externalId,
          provider: "remax",
          url: fullUrl,
          title,
          description: null,
          operation: params.operation,
          property_type: "apartment", // Default, refine from detail page
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
          images: imageEl
            ? [imageEl.getAttribute("src") || imageEl.getAttribute("data-src") || ""]
                .filter(Boolean)
            : [],
        });
      } catch (err) {
        console.error("Failed to parse RE/MAX card:", err);
      }
    }

    // Try to find total count and pagination info
    const totalEl = root.querySelector(
      '.results-count, .total-results, [data-testid="results-count"]'
    );
    const totalResults = this.parseNumber(totalEl?.text.trim()) || properties.length;

    return {
      properties,
      totalResults,
      hasMorePages: properties.length >= (params.pageSize ?? 20),
      currentPage: params.page ?? 1,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  private parsePrice(text: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.round(num * 100);
  }

  private parseArea(text?: string): number | null {
    if (!text) return null;
    const match = text.match(/([\d.,]+)\s*m/);
    if (!match) return null;
    return parseFloat(match[1].replace(",", ".")) || null;
  }

  private parseNumber(text?: string): number | null {
    if (!text) return null;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractId(href: string): string {
    // Extract ID from URL path like /imovel/12345
    const match = href.match(/(\d{4,})/);
    return match ? match[1] : href.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50);
  }
}
