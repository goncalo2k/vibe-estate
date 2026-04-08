import { hc } from "hono/client";
import type { AppType } from "@property-agg/api";

export const client = hc<AppType>("/");
