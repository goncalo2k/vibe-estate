import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-gray-500">Página não encontrada</p>
      <Link to="/" className="mt-4 text-sm text-blue-600 hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}
