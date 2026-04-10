import { parse } from "node-html-parser";
import type { PropertyInsert, ProviderSearchParams } from "@property-agg/shared";
import type { PropertyProvider, ProviderResult } from "./interface.js";

export class CasaSapoProvider implements PropertyProvider {
  readonly name = "casasapo";
  readonly type = "scraper" as const;

  private baseUrl = "https://casa.sapo.pt";

  async search(params: ProviderSearchParams): Promise<ProviderResult> {
    // Casa Sapo URL patterns:
    //   With location + type: /arrendar-apartamentos/lisboa/
    //   With location only:   /alugar/lisboa/  or  /comprar/lisboa/
    //   No location:          /alugar/         or  /comprar/
    const hasLocation = !!params.districts?.length;
    let path: string;

    if (hasLocation) {
      const operationPath = params.operation === "rent" ? "/arrendar" : "/comprar";
      const typePath = this.mapPropertyTypePath(params.propertyTypes);
      const locationPath = `/${this.normalizeLocation(params.districts![0])}`;
      path = `${operationPath}${typePath}${locationPath}/`;
    } else {
      path = params.operation === "rent" ? "/alugar/" : "/comprar/";
    }

    const url = new URL(path, this.baseUrl);

    if (params.minPrice) url.searchParams.set("pri", String(params.minPrice));
    if (params.maxPrice) url.searchParams.set("prf", String(params.maxPrice));
    if (params.minArea) url.searchParams.set("si", String(params.minArea));
    if (params.maxArea) url.searchParams.set("sf", String(params.maxArea));
    if (params.minRooms) url.searchParams.set("qi", String(params.minRooms));
    if (params.maxRooms) url.searchParams.set("qf", String(params.maxRooms));
    if (params.page && params.page > 1) url.searchParams.set("pn", String(params.page));

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        Referer: "https://casa.sapo.pt/",
      },
    });

    if (!response.ok) {
      throw new Error(`Casa Sapo fetch failed: ${response.status}`);
    }

    const html = await response.text();
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

  private parseHtml(html: string, params: ProviderSearchParams): ProviderResult {
    const root = parse(html);
    const properties: PropertyInsert[] = [];

    const cards = root.querySelectorAll(".property");

    for (const card of cards) {
      try {
        // Extract the detail URL from the link's href (it goes through a redirect)
        const linkEl = card.querySelector(".property-info");
        const rawHref = linkEl?.getAttribute("href") || "";
        const detailUrl = this.extractDetailUrl(rawHref);
        if (!detailUrl) continue;

        const typeEl = card.querySelector(".property-type");
        const locationEl = card.querySelector(".property-location");
        const priceEl = card.querySelector(".property-price-value");
        const featuresEl = card.querySelector(".property-features-text");
        const descriptionEl = card.querySelector(".property-description");
        const imgEl = card.querySelector("picture.property-photos img");

        const propertyType = typeEl?.text.trim() || "";
        const title = `${propertyType} ${locationEl?.text.trim() || ""}`.trim() || "Casa Sapo Property";
        const price = this.parsePrice(priceEl?.text.trim());
        if (!price) continue;

        const externalId = this.extractId(detailUrl);
        const location = this.parseLocation(locationEl?.text.trim());
        const features = featuresEl?.text.trim() || "";
        const area = this.parseArea(features);
        const rooms = this.parseRooms(propertyType);

        // Extract data from JSON-LD (most reliable source for image + coordinates)
        let image = "";
        let latitude: number | null = null;
        let longitude: number | null = null;
        const ldJsonEl = card.querySelector('script');
        if (ldJsonEl && ldJsonEl.text.includes('"@context"')) {
          try {
            const ld = JSON.parse(ldJsonEl.text);
            latitude = ld?.availableAtOrFrom?.geo?.latitude ?? null;
            longitude = ld?.availableAtOrFrom?.geo?.longitude ?? null;
            if (typeof ld?.image === "string" && ld.image.startsWith("http")) {
              image = ld.image;
            }
          } catch { /* ignore */ }
        }

        // Fallback: extract image from HTML
        if (!image) {
          const imgEl = card.querySelector(".swiper-slide img");
          const imgSrc =
            imgEl?.getAttribute("src") ||
            imgEl?.getAttribute("data-src") ||
            "";
          image = imgSrc && !imgSrc.startsWith("data:") ? imgSrc : "";
        }

        properties.push({
          external_id: externalId,
          provider: "casasapo",
          url: detailUrl,
          title,
          description: descriptionEl?.text.trim().slice(0, 2000) || null,
          operation: params.operation,
          property_type: this.mapPropertyType(propertyType),
          price_cents: price,
          price_period: params.operation === "rent" ? "month" : null,
          area_m2: area,
          rooms,
          bathrooms: null,
          floor: null,
          has_elevator: false,
          has_parking: false,
          has_terrace: false,
          energy_rating: null,
          condition: null,
          latitude,
          longitude,
          district: location.district || params.districts?.[0] || null,
          municipality: location.municipality || null,
          parish: location.parish || null,
          address: null,
          images: image ? [image] : [],
        });
      } catch (err) {
        console.error("Failed to parse Casa Sapo card:", err);
      }
    }

    // Total from h1 (e.g. "10 129 Imóveis para em Lisboa")
    const h1 = root.querySelector("h1");
    const totalMatch = h1?.text.match(/([\d\s.]+)/);
    const totalResults = totalMatch
      ? parseInt(totalMatch[1].replace(/[\s.]/g, ""), 10) || properties.length
      : properties.length;

    const nextPage = root.querySelector(".pagination a[href*='pn=']");

    return {
      properties,
      totalResults,
      hasMorePages: !!nextPage,
      currentPage: params.page ?? 1,
    };
  }

  private extractDetailUrl(href: string): string | null {
    // href goes through a redirect: ...&l=https://casa.sapo.pt/comprar-terreno-...html?g3pid=...
    const match = href.match(/[&?]l=(https?:\/\/casa\.sapo\.pt\/[^&]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]).split("?")[0];
      } catch {
        return match[1].split("?")[0];
      }
    }
    // Direct link
    if (href.startsWith("/") || href.startsWith("http")) {
      return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
    }
    return null;
  }

  private parseLocation(text?: string): { parish: string | null; municipality: string | null; district: string | null } {
    if (!text) return { parish: null, municipality: null, district: null };
    // Format: "Campolide, Lisboa, Distrito de Lisboa"
    const parts = text.split(",").map((s) => s.trim());
    const parish = parts[0] || null;
    const municipality = parts[1] || null;
    // The district part is "Distrito de X" — extract X
    const districtPart = parts[2] || "";
    const district = districtPart.replace(/^Distrito de\s*/i, "").trim() || null;
    return { parish, municipality, district };
  }

  private parseRooms(typeText: string): number | null {
    // "Apartamento T3" → 3
    const match = typeText.match(/T(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  private mapPropertyType(
    typeText: string
  ): "apartment" | "house" | "room" | "land" | "commercial" {
    const lower = typeText.toLowerCase();
    if (lower.includes("apartamento") || lower.includes("flat")) return "apartment";
    if (lower.includes("moradia") || lower.includes("vivenda") || lower.includes("quinta")) return "house";
    if (lower.includes("quarto")) return "room";
    if (lower.includes("terreno") || lower.includes("lote")) return "land";
    if (lower.includes("escritório") || lower.includes("loja") || lower.includes("armazém")) return "commercial";
    return "apartment";
  }

  private mapPropertyTypePath(types?: string[]): string {
    if (!types || types.length === 0) return "-casas";
    const map: Record<string, string> = {
      apartment: "-apartamentos",
      house: "-moradias",
      room: "-quartos",
      land: "-terrenos",
      commercial: "-escritorios",
    };
    return map[types[0]] || "-casas";
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

  private extractId(url: string): string {
    // URL: https://casa.sapo.pt/comprar-terreno-lisboa-campolide-717925b7-2141-11f1-8add-060000000054.html
    const match = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return match ? match[1] : url.replace(/[^a-zA-Z0-9]/g, "-").slice(-50);
  }
}
