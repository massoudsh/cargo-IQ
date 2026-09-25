import type { ShipmentOption, ShipmentRequest } from "./types.js";

interface HistoricalRouteOption extends ShipmentOption {
  baseOrigin: string;
  baseDestination: string;
  cargoTypes: string[];
  reliability: number;
}

const historicalOptions: HistoricalRouteOption[] = [
  {
    baseOrigin: "china",
    baseDestination: "iran",
    cargoTypes: ["electronics", "parts", "general"],
    forwarder: "SilkRoute Logistics",
    mode: "sea",
    estimatedCostUsd: 3900,
    estimatedDeliveryDays: 26,
    delayRiskScore: 0.16,
    reliability: 0.86,
    recommended: false,
  },
  {
    baseOrigin: "china",
    baseDestination: "iran",
    cargoTypes: ["electronics", "medical", "urgent"],
    forwarder: "Atlas Air Cargo",
    mode: "air",
    estimatedCostUsd: 9400,
    estimatedDeliveryDays: 5,
    delayRiskScore: 0.06,
    reliability: 0.93,
    recommended: false,
  },
  {
    baseOrigin: "turkey",
    baseDestination: "iran",
    cargoTypes: ["textile", "general", "parts"],
    forwarder: "Caspian Land Freight",
    mode: "land",
    estimatedCostUsd: 2100,
    estimatedDeliveryDays: 9,
    delayRiskScore: 0.11,
    reliability: 0.9,
    recommended: false,
  },
  {
    baseOrigin: "uae",
    baseDestination: "iran",
    cargoTypes: ["electronics", "general", "retail"],
    forwarder: "Gulf Bridge Forwarding",
    mode: "sea",
    estimatedCostUsd: 1800,
    estimatedDeliveryDays: 12,
    delayRiskScore: 0.09,
    reliability: 0.88,
    recommended: false,
  },
];

const priorityWeights: Record<ShipmentRequest["priority"], { cost: number; time: number; risk: number }> = {
  cost: { cost: 0.6, time: 0.2, risk: 0.2 },
  time: { cost: 0.2, time: 0.6, risk: 0.2 },
  balanced: { cost: 0.35, time: 0.35, risk: 0.3 },
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function routeMatches(option: HistoricalRouteOption, request: ShipmentRequest) {
  const origin = normalize(request.origin);
  const destination = normalize(request.destination);
  return origin.includes(option.baseOrigin) || destination.includes(option.baseDestination);
}

function cargoMatches(option: HistoricalRouteOption, request: ShipmentRequest) {
  const cargoType = normalize(request.cargoType);
  return option.cargoTypes.some((type) => cargoType.includes(type));
}

function scaled(value: number, min: number, max: number) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export function recommendShipmentOptions(request: ShipmentRequest): ShipmentOption[] {
  const candidates = historicalOptions
    .filter((option) => routeMatches(option, request) || cargoMatches(option, request))
    .concat(historicalOptions.filter((option) => !routeMatches(option, request) && !cargoMatches(option, request)));

  const uniqueCandidates = [...new Map(candidates.map((option) => [option.forwarder, option])).values()];
  const costs = uniqueCandidates.map((option) => option.estimatedCostUsd);
  const days = uniqueCandidates.map((option) => option.estimatedDeliveryDays);
  const weights = priorityWeights[request.priority];

  const scored = uniqueCandidates.map((option) => {
    const routeBonus = routeMatches(option, request) ? 0.12 : 0;
    const cargoBonus = cargoMatches(option, request) ? 0.08 : 0;
    const costScore = 1 - scaled(option.estimatedCostUsd, Math.min(...costs), Math.max(...costs));
    const timeScore = 1 - scaled(option.estimatedDeliveryDays, Math.min(...days), Math.max(...days));
    const riskScore = 1 - option.delayRiskScore;
    const score =
      costScore * weights.cost +
      timeScore * weights.time +
      riskScore * weights.risk +
      option.reliability * 0.1 +
      routeBonus +
      cargoBonus;

    return { option, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ option }, index) => ({
      forwarder: option.forwarder,
      mode: option.mode,
      estimatedCostUsd: option.estimatedCostUsd,
      estimatedDeliveryDays: option.estimatedDeliveryDays,
      delayRiskScore: option.delayRiskScore,
      recommended: index === 0,
    }));
}
