import { Link, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../client";
import Button from "../ui/Button";

const navLinks = [
  { to: "/", label: "Imóveis" },
  { to: "/searches", label: "Pesquisas Guardadas" },
];

export default function Header() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const triggerScrape = useMutation({
    mutationFn: async () => {
      const res = await client.api.trigger.scrape.$post();
      if (!res.ok) throw new Error("Failed to trigger scrape");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-bold text-gray-900">
          Estate2K
        </Link>
        <div className="flex items-center gap-2">
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
          <Button
            size="sm"
            variant="secondary"
            loading={triggerScrape.isPending}
            onClick={() => triggerScrape.mutate()}
          >
            {triggerScrape.isPending ? "A recolher..." : "Recolher imóveis"}
          </Button>
        </div>
      </div>
    </header>
  );
}
