import type { ExplainedShipmentOption, ImportRouteInput, ShipmentOption, ShipmentRequest } from "./types.js";

interface HistoricalRouteOption extends ShipmentOption {
  baseOrigin: string;
  baseDestination: string;
  cargoTypes: string[];
  reliability: number;
}

const baselineOptions: HistoricalRouteOption[] = [
  { baseOrigin: "china", baseDestination: "iran", cargoTypes: ["electronics", "parts", "general"], forwarder: "SilkRoute Logistics", mode: "sea", estimatedCostUsd: 3900, estimatedDeliveryDays: 26, delayRiskScore: 0.16, reliability: 0.86, recommended: false },
  { baseOrigin: "china", baseDestination: "iran", cargoTypes: ["electronics", "medical", "urgent"], forwarder: "Atlas Air Cargo", mode: "air", estimatedCostUsd: 9400, estimatedDeliveryDays: 5, delayRiskScore: 0.06, reliability: 0.93, recommended: false },
  { baseOrigin: "turkey", baseDestination: "iran", cargoTypes: ["textile", "general", "parts"], forwarder: "Caspian Land Freight", mode: "land", estimatedCostUsd: 2100, estimatedDeliveryDays: 9, delayRiskScore: 0.11, reliability: 0.9, recommended: false },
  { baseOrigin: "uae", baseDestination: "iran", cargoTypes: ["electronics", "general", "retail"], forwarder: "Gulf Bridge Forwarding", mode: "sea", estimatedCostUsd: 1800, estimatedDeliveryDays: 12, delayRiskScore: 0.09, reliability: 0.88, recommended: false },
];

const importedOptions = new Map<string, HistoricalRouteOption[]>();
const priorityWeights: Record<ShipmentRequest["priority"], { cost: number; time: number; risk: number }> = {
  cost: { cost: 0.6, time: 0.2, risk: 0.2 },
  time: { cost: 0.2, time: 0.6, risk: 0.2 },
  balanced: { cost: 0.35, time: 0.35, risk: 0.3 },
};

function normalize(value: string) { return value.trim().toLowerCase(); }
function routeMatches(option: HistoricalRouteOption, request: ShipmentRequest) {
  return normalize(request.origin).includes(option.baseOrigin) || normalize(request.destination).includes(option.baseDestination);
}
function cargoMatches(option: HistoricalRouteOption, request: ShipmentRequest) {
  return option.cargoTypes.some((type) => normalize(request.cargoType).includes(type));
}
function scaled(value: number, min: number, max: number) { return max === min ? 0 : (value - min) / (max - min); }

export function calculateChargeableWeightKg(request: ShipmentRequest) {
  const volumetricWeight = request.dimensionsCm
    ? (request.dimensionsCm.length * request.dimensionsCm.width * request.dimensionsCm.height * (request.pieces ?? 1)) / 6000
    : request.volumeCbm
      ? (request.volumeCbm * 1_000_000) / 6000
      : 0;
  return Math.max(request.weightKg ?? 0, volumetricWeight);
}

export function importRouteOptions(routes: ImportRouteInput[], tenantId: string) {
  const catalog = importedOptions.get(tenantId) ?? [];
  for (const route of routes) {
    const existingIndex = catalog.findIndex((option) => option.forwarder === route.forwarder && option.mode === route.mode && option.baseOrigin === normalize(route.origin) && option.baseDestination === normalize(route.destination));
    const next = { ...route, baseOrigin: normalize(route.origin), baseDestination: normalize(route.destination), cargoTypes: [normalize(route.cargoType)], recommended: false };
    if (existingIndex === -1) catalog.push(next);
    else catalog[existingIndex] = next;
  }
  importedOptions.set(tenantId, catalog);
}

export function recommendShipmentOptions(request: ShipmentRequest, tenantId = "development"): ExplainedShipmentOption[] {
  const source = [...(importedOptions.get(tenantId) ?? []), ...baselineOptions];
  const uniqueCandidates = source.filter((option, index) => source.findIndex((candidate) => candidate.forwarder === option.forwarder && candidate.mode === option.mode && candidate.baseOrigin === option.baseOrigin && candidate.baseDestination === option.baseDestination) === index);
  const costs = uniqueCandidates.map((option) => option.estimatedCostUsd);
  const days = uniqueCandidates.map((option) => option.estimatedDeliveryDays);
  const weights = priorityWeights[request.priority];
  const chargeableWeightKg = calculateChargeableWeightKg(request);
  const estimateReviewAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return uniqueCandidates.map((option) => {
    const routeMatch = routeMatches(option, request) ? 0.12 : 0;
    const cargoMatch = cargoMatches(option, request) ? 0.08 : 0;
    const cost = (1 - scaled(option.estimatedCostUsd, Math.min(...costs), Math.max(...costs))) * weights.cost;
    const time = (1 - scaled(option.estimatedDeliveryDays, Math.min(...days), Math.max(...days))) * weights.time;
    const risk = (1 - option.delayRiskScore) * weights.risk;
    const reliability = option.reliability * 0.1;
    const total = cost + time + risk + reliability + routeMatch + cargoMatch;
    const reasons = [routeMatch ? "تطبیق مسیر" : "گزینهٔ نمونه؛ مسیر نیازمند بررسی است", cargoMatch ? "تطبیق نوع کالا" : "", `ریسک تأخیر نمونه ${Math.round(option.delayRiskScore * 100)}٪`].filter(Boolean);
    return { ...option, recommended: false, chargeableWeightKg: option.mode === "air" && chargeableWeightKg > 0 ? chargeableWeightKg : undefined, estimateReviewAt, score: Math.round(total * 1000) / 1000, scoreBreakdown: { cost, time, risk, reliability, routeMatch, cargoMatch, total }, reasons };
  }).sort((a, b) => b.score - a.score).slice(0, 3).map((option, index) => ({ ...option, recommended: index === 0 }));
}

export function calculateConfidence(options: ExplainedShipmentOption[]) {
  if (options.length < 2) return 0.5;
  return Math.max(0.5, Math.min(0.95, 0.5 + (options[0].score - options[1].score) / 2));
}

export const decisionModelVersion = "rules-v2";
