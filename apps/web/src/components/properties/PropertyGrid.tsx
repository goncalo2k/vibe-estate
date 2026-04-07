import PropertyCard from "./PropertyCard";
import Spinner from "../ui/Spinner";

interface PropertyGridProps {
  properties: any[];
  isLoading: boolean;
}

export default function PropertyGrid({ properties, isLoading }: PropertyGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
        </svg>
        <p className="text-lg font-medium">Nenhum imóvel encontrado</p>
        <p className="text-sm">Tente ajustar os filtros de pesquisa</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property: any) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
