import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Spinner from "../ui/Spinner";
import { useSearches, useDeleteSearch } from "../../hooks/useSearches";
import { formatPrice } from "../../lib/formatters";

export default function SearchList() {
  const { data, isLoading } = useSearches();
  const deleteSearch = useDeleteSearch();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6 text-blue-600" />
      </div>
    );
  }

  const searches = data?.data ?? [];

  if (searches.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-500">
        Nenhuma pesquisa guardada. Crie uma acima.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {searches.map((search: any) => (
        <Card key={search.id} className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-medium text-gray-900">{search.name}</h3>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              <Badge>{search.operation === "rent" ? "Arrendar" : "Comprar"}</Badge>
              {search.districts?.map((d: string) => (
                <Badge key={d}>{d}</Badge>
              ))}
              {search.min_price_cents && (
                <span>Min: {formatPrice(search.min_price_cents)}</span>
              )}
              {search.max_price_cents && (
                <span>Max: {formatPrice(search.max_price_cents)}</span>
              )}
              {search.min_rooms && <span>{search.min_rooms}+ quartos</span>}
              {search.notify_email && (
                <Badge className="bg-blue-50 text-blue-700">
                  Notificações: {search.notify_email}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams();
                params.set("operation", search.operation);
                if (search.districts?.[0]) params.set("district", search.districts[0]);
                if (search.min_price_cents) params.set("min_price", String(search.min_price_cents / 100));
                if (search.max_price_cents) params.set("max_price", String(search.max_price_cents / 100));
                if (search.min_rooms) params.set("min_rooms", String(search.min_rooms));
                navigate(`/?${params.toString()}`);
              }}
            >
              Ver resultados
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteSearch.mutate(search.id)}
            >
              Apagar
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
