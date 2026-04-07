import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Imóveis" },
  { to: "/searches", label: "Pesquisas Guardadas" },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="text-lg font-bold text-gray-900">
          PropertyAgg
        </Link>
        <nav className="flex gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
