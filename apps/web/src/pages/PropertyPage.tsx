import { useParams, Link } from "react-router-dom";
import PropertyDetail from "../components/properties/PropertyDetail";
import Spinner from "../components/ui/Spinner";
import { useProperty } from "../hooks/useProperties";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useProperty(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">Imóvel não encontrado</p>
        <Link to="/" className="mt-2 text-sm text-blue-600 hover:underline">
          Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        &larr; Voltar à lista
      </Link>
      <PropertyDetail property={data.data} />
    </div>
  );
}
