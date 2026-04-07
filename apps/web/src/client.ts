import { hc } from "hono/client";
import type { AppType } from "@property-agg/api";

const baseUrl = import.meta.env.DEV
  ? "/"
  : "https://real-estate.api.goncalo2k.com";

export const client = hc<AppType>(baseUrl);
