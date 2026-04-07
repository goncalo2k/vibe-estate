import { useState } from "react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { useCreateSearch } from "../../hooks/useSearches";
import { OPERATIONS, DISTRICTS } from "../../lib/constants";

interface SearchFormProps {
  onSuccess?: () => void;
}

export default function SearchForm({ onSuccess }: SearchFormProps) {
  const [name, setName] = useState("");
  const [operation, setOperation] = useState("rent");
  const [district, setDistrict] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRooms, setMinRooms] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  const createSearch = useCreateSearch();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSearch.mutate(
      {
        name,
        operation,
        property_types: null,
        min_price_cents: minPrice ? Number(minPrice) * 100 : null,
        max_price_cents: maxPrice ? Number(maxPrice) * 100 : null,
        min_area_m2: null,
        max_area_m2: null,
        min_rooms: minRooms ? Number(minRooms) : null,
        max_rooms: null,
        districts: district ? [district] : null,
        municipalities: null,
        parishes: null,
        providers: null,
        notify_email: notifyEmail || null,
      },
      {
        onSuccess: () => {
          setName("");
          setOperation("rent");
          setDistrict("");
          setMinPrice("");
          setMaxPrice("");
          setMinRooms("");
          setNotifyEmail("");
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Nova pesquisa guardada</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nome"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='ex. "T2 Lisboa até 1200€"'
        />
        <Select
          label="Operação"
          options={OPERATIONS}
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
        />
        <Select
          label="Distrito"
          options={DISTRICTS.map((d) => ({ value: d, label: d }))}
          placeholder="Todos"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        />
        <Input
          label="Min € (preço)"
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <Input
          label="Max € (preço)"
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <Input
          label="Min quartos"
          type="number"
          value={minRooms}
          onChange={(e) => setMinRooms(e.target.value)}
        />
        <Input
          label="Email notificações"
          type="email"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="exemplo@email.com"
        />
      </div>
      <Button type="submit" loading={createSearch.isPending}>
        Guardar pesquisa
      </Button>
    </form>
  );
}
