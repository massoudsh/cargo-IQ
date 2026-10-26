import { Router } from "express";
import { calculateConfidence, decisionModelVersion, recommendShipmentOptions } from "../decisionEngine.js";
import { createDecisionId, type DecisionStore } from "../decisionStore.js";
import type { ShipmentRequest } from "../types.js";

export function createShipmentsRouter(store: DecisionStore) {
  const router = Router();

  router.post("/recommend", (req, res) => {
    if (!isShipmentRequest(req.body)) {
      res.status(400).json({ error: { code: "INVALID_REQUEST", message: "مشخصات محموله نامعتبر است." } });
      return;
    }

    const request = req.body;
    const options = recommendShipmentOptions(request, req.tenantId);
    const recommendation = {
      decisionId: createDecisionId(),
      modelVersion: decisionModelVersion,
      confidence: calculateConfidence(options),
      request,
      options,
      constraintsApplied: [`priority:${request.priority}`, "top-3-options"],
      createdAt: new Date().toISOString(),
    };
    store.saveRecommendation(req.tenantId, recommendation);
    res.status(201).json(recommendation);
  });

  router.get("/history", (req, res) => {
    res.json({ decisions: store.listRecommendations(req.tenantId) });
  });

  router.post("/:decisionId/feedback", (req, res) => {
    const decision = store.getRecommendation(req.tenantId, req.params.decisionId);
    if (!decision || !isFeedback(req.body)) {
      res.status(400).json({ error: { code: "INVALID_FEEDBACK", message: "بازخورد یا شناسهٔ تصمیم نامعتبر است." } });
      return;
    }
    const feedback = { decisionId: decision.decisionId, ...req.body, createdAt: new Date().toISOString() };
    store.saveFeedback(req.tenantId, feedback);
    res.status(201).json(feedback);
  });

  return router;
}

function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 300; }
function isOptionalNonNegativeNumber(value: unknown): value is number | undefined { return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9); }
function isShipmentRequest(value: unknown): value is ShipmentRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  const dimensions = request.dimensionsCm;
  const validDimensions = dimensions === undefined || (typeof dimensions === "object" && dimensions !== null && ["length", "width", "height"].every((key) => isPositiveNumber((dimensions as Record<string, unknown>)[key])));
  const validIncoterm = request.incoterm === undefined || ["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"].includes(request.incoterm as string);
  return isNonEmptyString(request.origin) && isNonEmptyString(request.destination) && isNonEmptyString(request.cargoType) && isOptionalNonNegativeNumber(request.weightKg) && isOptionalNonNegativeNumber(request.volumeCbm) && (request.pieces === undefined || (typeof request.pieces === "number" && Number.isInteger(request.pieces) && request.pieces > 0 && request.pieces <= 10000)) && validDimensions && validIncoterm && (request.priority === "cost" || request.priority === "time" || request.priority === "balanced");
}
function isPositiveNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10000; }
function isFeedback(value: unknown): value is { accepted: boolean; reason?: string; actualCostUsd?: number; actualDeliveryDays?: number } {
  if (typeof value !== "object" || value === null) return false;
  const feedback = value as Record<string, unknown>;
  return typeof feedback.accepted === "boolean" && (feedback.reason === undefined || typeof feedback.reason === "string") && isOptionalNonNegativeNumber(feedback.actualCostUsd) && isOptionalNonNegativeNumber(feedback.actualDeliveryDays);
}
