export function formatPrice(cents: number, period?: string | null): string {
  const euros = cents / 100;
  const formatted = euros.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const suffix = period === "month" ? "/mês" : "";
  return `${formatted} €${suffix}`;
}

export function formatArea(m2: number | null): string {
  if (m2 === null) return "N/A";
  return `${m2} m²`;
}

export function formatPricePerM2(cents: number, area: number | null): string {
  if (!area || area <= 0) return "N/A";
  const euroPerM2 = cents / 100 / area;
  return `${Math.round(euroPerM2).toLocaleString("pt-PT")} €/m²`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ratingLabel(rating: string): string {
  const labels: Record<string, string> = {
    great_deal: "Great Deal",
    good: "Good",
    fair: "Fair",
    overpriced: "Overpriced",
    unknown: "Unknown",
  };
  return labels[rating] || rating;
}

export function ratingColor(rating: string): string {
  const colors: Record<string, string> = {
    great_deal: "bg-green-600",
    good: "bg-blue-600",
    fair: "bg-amber-500",
    overpriced: "bg-red-600",
    unknown: "bg-gray-500",
  };
  return colors[rating] || "bg-gray-500";
}

export function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    idealista: "Idealista",
    remax: "RE/MAX",
    imovirtual: "Imovirtual",
    casasapo: "Casa Sapo",
    custojusto: "CustoJusto",
  };
  return labels[provider] || provider;
}
