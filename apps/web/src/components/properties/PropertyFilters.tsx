import { useState } from "react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import type { PropertyFilters as Filters } from "../../hooks/useProperties";
import { useLocations } from "../../hooks/useProperties";
import { OPERATIONS, PROPERTY_TYPES, PROVIDERS, DISTRICTS, SORT_OPTIONS } from "../../lib/constants";

interface PropertyFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function PropertyFilters({ filters, onChange }: PropertyFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: munData } = useLocations(filters.district);
  const { data: parData } = useLocations(filters.district, filters.municipality);

  const municipalities = (munData as any)?.municipalities ?? [];
  const parishes = (parData as any)?.parishes ?? [];

  const update = (key: string, value: string | number | undefined) => {
    const next = { ...filters, [key]: value || undefined, page: 1 };
    onChange(next);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Primary filters — always visible */}
      <div className="flex flex-wrap gap-3">
        <div className="w-32">
          <Select
            options={OPERATIONS}
            value={filters.operation || ""}
            placeholder="Operação"
            onChange={(e) => update("operation", e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            options={DISTRICTS.map((d) => ({ value: d, label: d }))}
            value={filters.district || ""}
            placeholder="Distrito"
            onChange={(e) => {
              const next = { ...filters, district: e.target.value || undefined, municipality: undefined, parish: undefined, page: 1 };
              onChange(next);
            }}
          />
        </div>
        {filters.district && municipalities.length > 0 && (
          <div className="w-40">
            <Select
              options={municipalities.map((m: string) => ({ value: m, label: m }))}
              value={filters.municipality || ""}
              placeholder="Município"
              onChange={(e) => {
                const next = { ...filters, municipality: e.target.value || undefined, parish: undefined, page: 1 };
                onChange(next);
              }}
            />
          </div>
        )}
        {filters.municipality && parishes.length > 0 && (
          <div className="w-44">
            <Select
              options={parishes.map((p: string) => ({ value: p, label: p }))}
              value={filters.parish || ""}
              placeholder="Freguesia"
              onChange={(e) => update("parish", e.target.value)}
            />
          </div>
        )}
        <div className="w-28">
          <Input
            type="number"
            placeholder="Min €"
            value={filters.min_price ?? ""}
            onChange={(e) => update("min_price", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="w-28">
          <Input
            type="number"
            placeholder="Max €"
            value={filters.max_price ?? ""}
            onChange={(e) => update("max_price", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="w-32">
          <Select
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+ quartos` }))}
            value={filters.min_rooms != null ? String(filters.min_rooms) : ""}
            placeholder="Quartos"
            onChange={(e) => update("min_rooms", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="w-36">
          <Select
            options={SORT_OPTIONS}
            value={filters.sort_by || "created_at"}
            onChange={(e) => update("sort_by", e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Menos filtros" : "Mais filtros"}
        </Button>
      </div>

      {/* Extended filters */}
      {expanded && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3">
          <div className="w-36">
            <Select
              options={PROPERTY_TYPES}
              value={filters.property_type || ""}
              placeholder="Tipo"
              onChange={(e) => update("property_type", e.target.value)}
            />
          </div>
          <div className="w-28">
            <Input
              type="number"
              placeholder="Min m²"
              value={filters.min_area ?? ""}
              onChange={(e) => update("min_area", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="w-28">
            <Input
              type="number"
              placeholder="Max m²"
              value={filters.max_area ?? ""}
              onChange={(e) => update("max_area", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="w-36">
            <Select
              options={PROVIDERS}
              value={filters.provider || ""}
              placeholder="Fonte"
              onChange={(e) => update("provider", e.target.value)}
            />
          </div>
          <div className="w-32">
            <Select
              options={[
                { value: "asc", label: "Ascendente" },
                { value: "desc", label: "Descendente" },
              ]}
              value={filters.sort_order || "desc"}
              onChange={(e) => update("sort_order", e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChange({ page: 1 })}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
