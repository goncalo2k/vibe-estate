import SearchForm from "../components/searches/SearchForm";
import SearchList from "../components/searches/SearchList";

export default function SearchesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pesquisas Guardadas</h1>
      <SearchForm />
      <SearchList />
    </div>
  );
}
