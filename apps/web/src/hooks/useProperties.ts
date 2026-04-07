import { useQuery } from "@tanstack/react-query";
import { client } from "../client";

export interface PropertyFilters {
  operation?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  min_rooms?: number;
  max_rooms?: number;
  district?: string;
  municipality?: string;
  provider?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

export function useProperties(filters: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      const query: Record<string, string> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
          query[key] = String(value);
        }
      }
      const res = await client.api.properties.$get({ query: query as any });
      if (!res.ok) throw new Error("Failed to fetch properties");
      return res.json();
    },
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await client.api.properties[":id"].$get({ param: { id } });
      if (!res.ok) throw new Error("Failed to fetch property");
      return res.json();
    },
    enabled: !!id,
  });
}
