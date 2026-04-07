export const OPERATIONS = [
  { value: "rent", label: "Arrendar" },
  { value: "buy", label: "Comprar" },
] as const;

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Moradia" },
  { value: "room", label: "Quarto" },
  { value: "land", label: "Terreno" },
  { value: "commercial", label: "Comercial" },
] as const;

export const PROVIDERS = [
  { value: "idealista", label: "Idealista" },
  { value: "remax", label: "RE/MAX" },
  { value: "imovirtual", label: "Imovirtual" },
] as const;

export const DISTRICTS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco",
  "Coimbra", "Évora", "Faro", "Guarda", "Leiria",
  "Lisboa", "Portalegre", "Porto", "Santarém", "Setúbal",
  "Viana do Castelo", "Vila Real", "Viseu",
  "Ilha da Madeira", "Ilha de Porto Santo",
  "Ilha de São Miguel", "Ilha Terceira",
] as const;

export const SORT_OPTIONS = [
  { value: "created_at", label: "Mais recentes" },
  { value: "price", label: "Preço" },
  { value: "area", label: "Área" },
  { value: "score", label: "Classificação AI" },
] as const;
