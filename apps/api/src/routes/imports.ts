import { Router } from "express";
import { importRouteOptions } from "../decisionEngine.js";
import type { ImportRouteInput } from "../types.js";

export const importsRouter = Router();

importsRouter.post("/routes", (req, res) => {
  const routes = parseRoutes(req.body);
  if (!routes) {
    res.status(400).json({ error: { code: "INVALID_IMPORT", message: "دادهٔ مسیرها نامعتبر است." } });
    return;
  }
  importRouteOptions(routes);
  res.status(201).json({ imported: routes.length });
});

function parseRoutes(value: unknown): ImportRouteInput[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return undefined;
  const modes = new Set(["sea", "air", "land"]);
  const routes = value.map((item) => {
    if (typeof item !== "object" || item === null) return undefined;
    const route = item as Record<string, unknown>;
    const strings = ["origin", "destination", "cargoType", "forwarder"] as const;
    if (strings.some((key) => typeof route[key] !== "string" || !route[key].trim()) || !modes.has(route.mode as string)) return undefined;
    const numbers = ["estimatedCostUsd", "estimatedDeliveryDays", "delayRiskScore", "reliability"] as const;
    if (numbers.some((key) => typeof route[key] !== "number" || !Number.isFinite(route[key]) || route[key] < 0) || (route.delayRiskScore as number) > 1 || (route.reliability as number) > 1) return undefined;
    return route as unknown as ImportRouteInput;
  });
  return routes.some((route) => route === undefined) ? undefined : routes as ImportRouteInput[];
}
