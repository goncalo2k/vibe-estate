import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PropertyFilters from "../components/properties/PropertyFilters";
import PropertyGrid from "../components/properties/PropertyGrid";
import Pagination from "../components/ui/Pagination";
import { useProperties, type PropertyFilters as Filters } from "../hooks/useProperties";

function filtersFromSearchParams(params: URLSearchParams): Filters {
  const f: Filters = {};
  const str = (key: string) => params.get(key) || undefined;
  const num = (key: string) => {
    const v = params.get(key);
    return v ? Number(v) : undefined;
  };

  f.operation = str("operation");
  f.property_type = str("property_type");
  f.district = str("district");
  f.municipality = str("municipality");
  f.provider = str("provider");
  f.sort_by = str("sort_by");
  f.sort_order = str("sort_order");
  f.min_price = num("min_price");
  f.max_price = num("max_price");
  f.min_area = num("min_area");
  f.max_area = num("max_area");
  f.min_rooms = num("min_rooms");
  f.max_rooms = num("max_rooms");
  f.page = num("page") || 1;

  return f;
}

function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  return params;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromSearchParams(searchParams);
  const { data, isLoading } = useProperties(filters);

  const handleFilterChange = (newFilters: Filters) => {
    setSearchParams(filtersToSearchParams(newFilters));
  };

  return (
    <div>
      <PropertyFilters filters={filters} onChange={handleFilterChange} />
      <PropertyGrid
        properties={data?.data ?? []}
        isLoading={isLoading}
      />
      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={(page) => handleFilterChange({ ...filters, page })}
        />
      )}
      {data && (
        <div className="py-2 text-center text-xs text-gray-400">
          {data.total} imóveis encontrados
        </div>
      )}
    </div>
  );
}
