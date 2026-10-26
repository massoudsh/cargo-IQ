export interface ShipmentRequest {
  origin: string;
  destination: string;
  cargoType: string;
  weightKg?: number;
  volumeCbm?: number;
  pieces?: number;
  dimensionsCm?: { length: number; width: number; height: number };
  incoterm?: "EXW" | "FOB" | "CFR" | "CIF" | "DAP" | "DDP";
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
  chargeableWeightKg?: number;
  estimateReviewAt: string;
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

export interface ComplianceCheck {
  code: string;
  title: string;
  status: "required" | "recommended" | "review";
  guidance: string;
}

export interface ComplianceResult {
  checks: ComplianceCheck[];
  disclaimer: string;
}

export interface RfqRequest {
  rfqId: string;
  decisionId: string;
  forwarders: string[];
  status: "draft" | "expired";
  expiresAt: string;
  createdAt: string;
}

export type MilestoneCode = "registered" | "picked-up" | "in-transit" | "customs" | "delivered";

export interface TrackingRecord {
  trackingCode: string;
  decisionId: string;
  source: "manual";
  events: { code: MilestoneCode; occurredAt: string }[];
}
