import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import AiAnalysisBadge from "./AiAnalysisBadge";
import { formatPrice, formatArea, providerLabel } from "../../lib/formatters";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    price_cents: number;
    price_period: string | null;
    area_m2: number | null;
    rooms: number | null;
    bathrooms: number | null;
    district: string | null;
    municipality: string | null;
    provider: string;
    images: string[];
    operation: string;
    analysis?: { rating: string; score: number | null } | null;
  };
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const navigate = useNavigate();
  const image = property.images[0];

  return (
    <Card onClick={() => navigate(`/properties/${property.id}`)} className="overflow-hidden">
      <div className="relative aspect-[16/10] bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={property.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Sem imagem
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge className="bg-white/90 text-gray-700 shadow-sm">
            {providerLabel(property.provider)}
          </Badge>
          {property.analysis && (
            <AiAnalysisBadge
              rating={property.analysis.rating}
              score={property.analysis.score}
            />
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1 text-lg font-bold text-gray-900">
          {formatPrice(property.price_cents, property.price_period)}
        </div>
        <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-700">
          {property.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {property.rooms != null && (
            <span>{property.rooms} {property.rooms === 1 ? "quarto" : "quartos"}</span>
          )}
          {property.area_m2 && <span>{formatArea(property.area_m2)}</span>}
          {property.bathrooms != null && (
            <span>{property.bathrooms} {property.bathrooms === 1 ? "wc" : "wcs"}</span>
          )}
        </div>
        {(property.municipality || property.district) && (
          <div className="mt-1 text-xs text-gray-400">
            {[property.municipality, property.district].filter(Boolean).join(", ")}
          </div>
        )}
      </div>
    </Card>
  );
}
