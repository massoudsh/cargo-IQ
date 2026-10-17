export interface ShipmentRequest {
  origin: string;
  destination: string;
  cargoType: string;
  weightKg?: number;
  volumeCbm?: number;
  priority: "cost" | "time" | "balanced";
}

export interface ShipmentOption {
  forwarder: string;
  mode: "sea" | "air" | "land";
  estimatedCostUsd: number;
  estimatedDeliveryDays: number;
  delayRiskScore: number;
  recommended: boolean;
  score: number;
  reasons: string[];
}

export interface RecommendResponse {
  decisionId: string;
  modelVersion: string;
  confidence: number;
  request: ShipmentRequest;
  options: ShipmentOption[];
  constraintsApplied: string[];
  createdAt: string;
}
