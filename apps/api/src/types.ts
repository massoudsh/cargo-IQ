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
}

export interface ScoreBreakdown {
  cost: number;
  time: number;
  risk: number;
  reliability: number;
  routeMatch: number;
  cargoMatch: number;
  total: number;
}

export interface ExplainedShipmentOption extends ShipmentOption {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
}

export interface Recommendation {
  decisionId: string;
  modelVersion: string;
  confidence: number;
  request: ShipmentRequest;
  options: ExplainedShipmentOption[];
  constraintsApplied: string[];
  createdAt: string;
}

export interface Feedback {
  decisionId: string;
  accepted: boolean;
  reason?: string;
  actualCostUsd?: number;
  actualDeliveryDays?: number;
  createdAt: string;
}

export interface ImportRouteInput {
  origin: string;
  destination: string;
  cargoType: string;
  forwarder: string;
  mode: ShipmentOption["mode"];
  estimatedCostUsd: number;
  estimatedDeliveryDays: number;
  delayRiskScore: number;
  reliability: number;
}
