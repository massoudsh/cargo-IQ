import type { ExplainedShipmentOption, ImportRouteInput, Recommendation, ShipmentOption, ShipmentRequest } from "./types.js";

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

const importedOptions: HistoricalRouteOption[] = [];
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

export function importRouteOptions(routes: ImportRouteInput[]) {
  for (const route of routes) {
    const existingIndex = importedOptions.findIndex((option) => option.forwarder === route.forwarder && option.baseOrigin === normalize(route.origin) && option.baseDestination === normalize(route.destination));
    const next = { ...route, baseOrigin: normalize(route.origin), baseDestination: normalize(route.destination), cargoTypes: [normalize(route.cargoType)], recommended: false };
    if (existingIndex === -1) importedOptions.push(next);
    else importedOptions[existingIndex] = next;
  }
}

export function recommendShipmentOptions(request: ShipmentRequest): ExplainedShipmentOption[] {
  const source = [...importedOptions, ...baselineOptions];
  const candidates = source.filter((option) => routeMatches(option, request) || cargoMatches(option, request))
    .concat(source.filter((option) => !routeMatches(option, request) && !cargoMatches(option, request)));
  const uniqueCandidates = [...new Map(candidates.map((option) => [option.forwarder, option])).values()];
  const costs = uniqueCandidates.map((option) => option.estimatedCostUsd);
  const days = uniqueCandidates.map((option) => option.estimatedDeliveryDays);
  const weights = priorityWeights[request.priority];

  return uniqueCandidates.map((option) => {
    const routeMatch = routeMatches(option, request) ? 0.12 : 0;
    const cargoMatch = cargoMatches(option, request) ? 0.08 : 0;
    const cost = (1 - scaled(option.estimatedCostUsd, Math.min(...costs), Math.max(...costs))) * weights.cost;
    const time = (1 - scaled(option.estimatedDeliveryDays, Math.min(...days), Math.max(...days))) * weights.time;
    const risk = (1 - option.delayRiskScore) * weights.risk;
    const reliability = option.reliability * 0.1;
    const total = cost + time + risk + reliability + routeMatch + cargoMatch;
    const reasons = [routeMatch ? "تطبیق مسیر" : "", cargoMatch ? "تطبیق نوع کالا" : "", `ریسک تأخیر ${Math.round(option.delayRiskScore * 100)}٪`].filter(Boolean);
    return { ...option, recommended: false, score: Math.round(total * 1000) / 1000, scoreBreakdown: { cost, time, risk, reliability, routeMatch, cargoMatch, total }, reasons };
  }).sort((a, b) => b.score - a.score).slice(0, 3).map((option, index) => ({ ...option, recommended: index === 0 }));
}

export function calculateConfidence(options: ExplainedShipmentOption[]) {
  if (options.length < 2) return 0.5;
  return Math.max(0.5, Math.min(0.95, 0.5 + (options[0].score - options[1].score) / 2));
}

export const decisionModelVersion = "rules-v1";
export type { Recommendation };
