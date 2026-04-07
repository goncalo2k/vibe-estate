import type { PropertyProvider } from "./interface.js";
import type { Bindings } from "../bindings.js";
import { IdealistaProvider } from "./idealista.js";
import { RemaxProvider } from "./remax.js";
import { ImovirtualProvider } from "./imovirtual.js";

export function createProviderRegistry(env: Bindings): Map<string, PropertyProvider> {
  const registry = new Map<string, PropertyProvider>();

  registry.set(
    "idealista",
    new IdealistaProvider(env.IDEALISTA_API_KEY, env.IDEALISTA_API_SECRET)
  );
  registry.set("remax", new RemaxProvider());
  registry.set("imovirtual", new ImovirtualProvider());

  return registry;
}
