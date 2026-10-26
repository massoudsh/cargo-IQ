import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DecisionStore } from "../decisionStore.js";
import type { RfqRequest } from "../types.js";

export function createQuotesRouter(store: DecisionStore) {
  const router = Router();
  const rfqs = new Map<string, RfqRequest>();

  router.post("/request", (req, res) => {
    const { decisionId, forwarders } = req.body ?? {};
    const decision = typeof decisionId === "string" ? store.getRecommendation(req.tenantId, decisionId) : undefined;
    if (!decision || !Array.isArray(forwarders) || forwarders.length < 1 || forwarders.length > 10 || forwarders.some((item) => typeof item !== "string" || !decision.options.some((option) => option.forwarder === item))) {
      res.status(400).json({ error: { code: "INVALID_RFQ", message: "تصمیم یا فورواردرهای منتخب معتبر نیستند." } });
      return;
    }
    const now = new Date();
    if (decision.options.some((option) => forwarders.includes(option.forwarder) && Date.parse(option.estimateReviewAt) <= now.getTime())) {
      res.status(409).json({ error: { code: "STALE_DECISION", message: "ابتدا پیشنهادها را به‌روز کنید." } });
      return;
    }
    const rfq: RfqRequest = {
      rfqId: `rfq_${randomUUID()}`, decisionId, forwarders: [...new Set<string>(forwarders)], status: "draft",
      expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(), createdAt: now.toISOString(),
    };
    rfqs.set(`${req.tenantId}:${rfq.rfqId}`, rfq);
    res.status(201).json(rfq);
  });

  router.get("/:rfqId", (req, res) => {
    const rfq = rfqs.get(`${req.tenantId}:${req.params.rfqId}`);
    if (!rfq) {
      res.status(404).json({ error: { code: "RFQ_NOT_FOUND", message: "پیش‌نویس استعلام پیدا نشد." } });
      return;
    }
    res.json({ ...rfq, status: Date.parse(rfq.expiresAt) <= Date.now() ? "expired" : "draft" });
  });

  return router;
}
