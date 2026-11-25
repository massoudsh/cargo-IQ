import { Router } from "express";
import type { DecisionStore } from "../decisionStore.js";
import { buildInsights, estimateDemurrage, isDemurrageRequest } from "../insights.js";

export function createInsightsRouter(store: DecisionStore) {
  const router = Router();

  router.get("/:decisionId", (req, res) => {
    const decision = store.getRecommendation(req.tenantId, req.params.decisionId);
    if (!decision) {
      res.status(404).json({ error: { code: "DECISION_NOT_FOUND", message: "تصمیم پیدا نشد." } });
      return;
    }
    const raw = req.query.distanceKm;
    let distanceKm: number | undefined;
    if (raw !== undefined) {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100_000) {
        res.status(400).json({ error: { code: "INVALID_DISTANCE", message: "فاصله باید عددی بین ۱ و ۱۰۰٬۰۰۰ کیلومتر باشد." } });
        return;
      }
      distanceKm = parsed;
    }
    res.json(buildInsights(decision, distanceKm));
  });

  router.post("/demurrage", (req, res) => {
    if (!isDemurrageRequest(req.body)) {
      res.status(400).json({ error: { code: "INVALID_DEMURRAGE", message: "تاریخ‌ها، روزهای آزاد و نرخ روزانه را معتبر وارد کنید." } });
      return;
    }
    res.json(estimateDemurrage(req.body));
  });

  return router;
}
