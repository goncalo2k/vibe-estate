import { useState } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import AiAnalysisBadge from "./AiAnalysisBadge";
import { useTriggerAnalysis } from "../../hooks/useAnalysis";
import {
  formatPrice,
  formatArea,
  formatPricePerM2,
  formatDate,
  providerLabel,
  ratingLabel,
  ratingColor,
} from "../../lib/formatters";

interface Analysis {
  summary: string;
  rating: string;
  score: number | null;
  pros: string[];
  cons: string[];
  price_per_m2_cents: number | null;
  market_avg_price_per_m2_cents: number | null;
  created_at: string;
}

interface PropertyDetailProps {
  property: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    price_cents: number;
    price_period: string | null;
    area_m2: number | null;
    rooms: number | null;
    bathrooms: number | null;
    floor: string | null;
    has_elevator: boolean;
    has_parking: boolean;
    has_terrace: boolean;
    energy_rating: string | null;
    condition: string | null;
    district: string | null;
    municipality: string | null;
    parish: string | null;
    address: string | null;
    provider: string;
    images: string[];
    operation: string;
    created_at: string;
    first_seen_at: string;
    analysis: Analysis | null;
  };
}

export default function PropertyDetail({ property }: PropertyDetailProps) {
  const [imageIdx, setImageIdx] = useState(0);
  const triggerAnalysis = useTriggerAnalysis();

  const details = [
    { label: "Tipo", value: property.operation === "rent" ? "Arrendamento" : "Venda" },
    { label: "Quartos", value: property.rooms },
    { label: "Casas de banho", value: property.bathrooms },
    { label: "Área", value: property.area_m2 ? formatArea(property.area_m2) : null },
    { label: "€/m²", value: formatPricePerM2(property.price_cents, property.area_m2) },
    { label: "Piso", value: property.floor },
    { label: "Elevador", value: property.has_elevator ? "Sim" : null },
    { label: "Estacionamento", value: property.has_parking ? "Sim" : null },
    { label: "Terraço", value: property.has_terrace ? "Sim" : null },
    { label: "Certificado energético", value: property.energy_rating },
    { label: "Condição", value: property.condition },
    { label: "Primeiro visto", value: formatDate(property.first_seen_at) },
  ].filter((d) => d.value != null && d.value !== "N/A");

  return (
    <div>
      {/* Image gallery */}
      {property.images.length > 0 && (
        <div className="mb-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-gray-100">
            <img
              src={property.images[imageIdx]}
              alt={property.title}
              className="h-full w-full object-cover"
            />
            {property.images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIdx((i) => (i - 1 + property.images.length) % property.images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  &#8592;
                </button>
                <button
                  onClick={() => setImageIdx((i) => (i + 1) % property.images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  &#8594;
                </button>
                <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                  {imageIdx + 1} / {property.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {[property.parish, property.municipality, property.district].filter(Boolean).join(", ")}
            {property.address && ` · ${property.address}`}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge className="bg-gray-100 text-gray-700">{providerLabel(property.provider)}</Badge>
            {property.analysis && (
              <AiAnalysisBadge rating={property.analysis.rating} score={property.analysis.score} />
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            {formatPrice(property.price_cents, property.price_period)}
          </div>
          <a
            href={property.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Ver no {providerLabel(property.provider)} &#8599;
          </a>
        </div>
      </div>

      {/* Details grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
        {details.map((d) => (
          <div key={d.label}>
            <div className="text-xs text-gray-500">{d.label}</div>
            <div className="font-medium text-gray-900">{d.value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {property.description && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-gray-900">Descrição</h2>
          <p className="whitespace-pre-line text-sm text-gray-700">{property.description}</p>
        </div>
      )}

      {/* AI Analysis */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Análise AI</h2>
          {!property.analysis && (
            <Button
              size="sm"
              loading={triggerAnalysis.isPending}
              onClick={() => triggerAnalysis.mutate(property.id)}
            >
              Analisar
            </Button>
          )}
        </div>

        {property.analysis ? (
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            {/* Score + Rating */}
            <div className="mb-4 flex flex-col items-center gap-3 rounded-lg bg-gray-50 px-4 py-4 sm:flex-row sm:gap-4">
              {property.analysis.score != null && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-gray-900 sm:text-4xl">{property.analysis.score}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              )}
              <div className="flex flex-col items-center gap-1 sm:items-start">
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold text-white ${ratingColor(property.analysis.rating)}`}>
                  {ratingLabel(property.analysis.rating)}
                </span>
              </div>
            </div>

            {/* Summary */}
            <p className="mb-5 text-sm leading-relaxed text-gray-700 sm:text-base">{property.analysis.summary}</p>

            {/* Pros & Cons */}
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {property.analysis.pros.length > 0 && (
                <div className="rounded-lg border border-green-100 bg-green-50/50 p-3 sm:p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-800">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-600">&#10003;</span>
                    Pontos positivos
                  </h3>
                  <ul className="space-y-2">
                    {property.analysis.pros.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-snug text-gray-700">
                        <span className="mt-0.5 shrink-0 text-green-500">&bull;</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {property.analysis.cons.length > 0 && (
                <div className="rounded-lg border border-red-100 bg-red-50/50 p-3 sm:p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-800">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-600">&#10005;</span>
                    Pontos negativos
                  </h3>
                  <ul className="space-y-2">
                    {property.analysis.cons.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm leading-snug text-gray-700">
                        <span className="mt-0.5 shrink-0 text-red-500">&bull;</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-center sm:px-5 sm:py-8">
            <p className="text-sm text-gray-500">
              Ainda sem análise. Clique em "Analisar" para gerar uma avaliação com AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
