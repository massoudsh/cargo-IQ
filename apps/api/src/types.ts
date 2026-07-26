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
  delayRiskScore: number; // 0..1
  recommended: boolean;
}
