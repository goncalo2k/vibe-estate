import type { PropertyProvider } from "./interface.js";
import type { Bindings } from "../bindings.js";
import { IdealistaProvider } from "./idealista.js";
import { ImovirtualProvider } from "./imovirtual.js";
import { CasaSapoProvider } from "./casasapo.js";
import { CustoJustoProvider } from "./custojusto.js";

export function createProviderRegistry(env: Bindings): Map<string, PropertyProvider> {
  const registry = new Map<string, PropertyProvider>();

  registry.set(
    "idealista",
    new IdealistaProvider(env.IDEALISTA_API_KEY, env.IDEALISTA_API_SECRET)
  );
  registry.set("imovirtual", new ImovirtualProvider());
  registry.set("casasapo", new CasaSapoProvider());
  registry.set("custojusto", new CustoJustoProvider());

  return registry;
}
