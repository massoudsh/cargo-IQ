import { Router } from "express";
import { calculateConfidence, decisionModelVersion, recommendShipmentOptions } from "../decisionEngine.js";
import { createDecisionId, type DecisionStore } from "../decisionStore.js";
import type { ShipmentRequest } from "../types.js";

export function createCopilotRouter(store: DecisionStore) {
  const router = Router();

  router.post("/recommend", (req, res) => {
    if (typeof req.body?.message !== "string" || !req.body.message.trim()) {
      res.status(400).json({ error: { code: "INVALID_MESSAGE", message: "پیام درخواست الزامی است." } });
      return;
    }
    const request = extractConstraints(req.body.message);
    if (!request) {
      res.status(422).json({ error: { code: "MISSING_CONSTRAINTS", message: "مبدأ، مقصد و نوع کالا را در پیام مشخص کنید." } });
      return;
    }
    const options = recommendShipmentOptions(request);
    const recommendation = {
      decisionId: createDecisionId(), modelVersion: decisionModelVersion, confidence: calculateConfidence(options), request, options,
      constraintsApplied: ["copilot:deterministic-parser", `priority:${request.priority}`, "human-approval-required"], createdAt: new Date().toISOString(),
    };
    store.saveRecommendation(req.tenantId, recommendation);
    res.status(201).json({ ...recommendation, nextAction: "پیش از اقدام خارجی، گزینه را بررسی و تأیید کنید." });
  });
  return router;
}

function extractConstraints(message: string): ShipmentRequest | undefined {
  const match = message.match(/(?:از|from)\s+([^،,]+)\s+(?:به|to)\s+([^،,]+)\s+(?:برای|cargo)\s+([^،,]+)/i);
  if (!match) return undefined;
  const lower = message.toLowerCase();
  return { origin: match[1].trim(), destination: match[2].trim(), cargoType: match[3].trim(), priority: lower.includes("فوری") || lower.includes("urgent") ? "time" : lower.includes("ارزان") || lower.includes("cost") ? "cost" : "balanced" };
}
