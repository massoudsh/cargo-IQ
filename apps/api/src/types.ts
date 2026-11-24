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
  billing?: BillingBasis;
  estimateReviewAt: string;
}

export interface Recommendation {
  decisionId: string;
  modelVersion: string;
  confidence: number;
  request: ShipmentRequest;
  options: ExplainedShipmentOption[];
  measures: FreightMeasures;
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

export type BillingUnit = "kg" | "revenue-ton" | "ldm";

export interface BillingBasis {
  unit: BillingUnit;
  value: number;
  basis: "actual-weight" | "volumetric-weight" | "weight-or-measure" | "loading-metre";
}

export interface FreightMeasures {
  volumeCbm: number;
  actualWeightKg: number;
  air: { volumetricKg: number; chargeableKg: number; basis: "actual" | "volumetric" };
  seaLcl: { revenueTon: number; basis: "weight" | "volume" };
  road: { volumetricKg: number; chargeableKg: number; loadingMetres: number; basis: "actual" | "volumetric" };
}

export interface LandedCostRequest {
  decisionId: string;
  declaredValueUsd: number;
  dutyRatePct?: number;
  vatRatePct?: number;
  insuranceRatePct?: number;
  freightUsd?: number;
  fxRateIrrPerUsd?: number;
}

export interface LandedCostLine {
  code: "goods" | "freight" | "insurance" | "duty" | "vat";
  label: string;
  amountUsd: number;
  /** False when the cost is already inside the goods price for this Incoterm. */
  counted: boolean;
  note: string;
}

export interface LandedCostResult {
  decisionId: string;
  incoterm: NonNullable<ShipmentRequest["incoterm"]> | null;
  customsValueUsd: number;
  lines: LandedCostLine[];
  totalUsd: number;
  totalIrr?: number;
  assumptions: string[];
  disclaimer: string;
}

export interface QuoteOffer {
  rfqId: string;
  forwarder: string;
  costUsd: number;
  transitDays: number;
  validUntil?: string;
  note?: string;
  recordedAt: string;
}

export interface OfferComparison {
  rfqId: string;
  offers: QuoteOffer[];
  estimateUsd: number | null;
  cheapest: string | null;
  fastest: string | null;
  bestValue: string | null;
  methodology: string;
  disclaimer: string;
}

export interface ReadinessCheck extends ComplianceCheck {
  prepared: boolean;
  preparedAt?: string;
}

export interface ReadinessResult {
  decisionId: string;
  checks: ReadinessCheck[];
  outstandingRequired: number;
  disclaimer: string;
}
