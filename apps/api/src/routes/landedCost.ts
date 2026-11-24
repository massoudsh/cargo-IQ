import { Router } from "express";
import type { DecisionStore } from "../decisionStore.js";
import { calculateLandedCost, isLandedCostRequest, landedCostDisclaimer } from "../landedCost.js";

export function createLandedCostRouter(store: DecisionStore) {
  const router = Router();

  router.post("/estimate", (req, res) => {
    const { decisionId, ...input } = req.body ?? {};
    const decision = typeof decisionId === "string" ? store.getRecommendation(req.tenantId, decisionId) : undefined;
    if (!decision || !isLandedCostRequest(input)) {
      res.status(400).json({ error: { code: "INVALID_LANDED_COST", message: "شناسهٔ تصمیم یا مقادیر هزینه و نرخ‌ها معتبر نیستند." } });
      return;
    }
    res.json(calculateLandedCost(decision, input));
  });

  router.get("/assumptions", (_req, res) => res.json({ disclaimer: landedCostDisclaimer }));

  return router;
}
