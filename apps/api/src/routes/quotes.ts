import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DecisionStore } from "../decisionStore.js";
import type { OfferComparison, QuoteOffer, RfqRequest } from "../types.js";

export function createQuotesRouter(store: DecisionStore) {
  const router = Router();
  const rfqs = new Map<string, RfqRequest>();
  const offers = new Map<string, QuoteOffer[]>();

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

  router.post("/:rfqId/offers", (req, res) => {
    const key = `${req.tenantId}:${req.params.rfqId}`;
    const rfq = rfqs.get(key);
    if (!rfq) {
      res.status(404).json({ error: { code: "RFQ_NOT_FOUND", message: "پیش‌نویس استعلام پیدا نشد." } });
      return;
    }
    const body = req.body ?? {};
    if (!rfq.forwarders.includes(body.forwarder) || !isMoney(body.costUsd) || !isDays(body.transitDays) || (body.validUntil !== undefined && (!isValidDate(body.validUntil))) || (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 500))) {
      res.status(400).json({ error: { code: "INVALID_OFFER", message: "فورواردر باید از فهرست استعلام باشد و هزینه، زمان و تاریخ اعتبار معتبر لازم است." } });
      return;
    }
    const offer: QuoteOffer = {
      rfqId: rfq.rfqId, forwarder: body.forwarder, costUsd: body.costUsd, transitDays: body.transitDays,
      validUntil: body.validUntil, note: body.note?.trim() || undefined, recordedAt: new Date().toISOString(),
    };
    const recorded = (offers.get(key) ?? []).filter((item) => item.forwarder !== offer.forwarder);
    if (recorded.length >= 10) {
      res.status(400).json({ error: { code: "TOO_MANY_OFFERS", message: "برای هر استعلام حداکثر ۱۰ پیشنهاد ثبت می‌شود." } });
      return;
    }
    offers.set(key, [...recorded, offer]);
    res.status(201).json(offer);
  });

  router.get("/:rfqId/offers", (req, res) => {
    const key = `${req.tenantId}:${req.params.rfqId}`;
    const rfq = rfqs.get(key);
    if (!rfq) {
      res.status(404).json({ error: { code: "RFQ_NOT_FOUND", message: "پیش‌نویس استعلام پیدا نشد." } });
      return;
    }
    res.json(compareOffers(rfq, offers.get(key) ?? [], store.getRecommendation(req.tenantId, rfq.decisionId)?.options[0]?.estimatedCostUsd ?? null));
  });

  return router;
}

function isMoney(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9; }
function isDays(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 3650; }
function isValidDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

export function compareOffers(rfq: RfqRequest, offers: QuoteOffer[], estimateUsd: number | null): OfferComparison {
  const valid = offers.filter((offer) => !offer.validUntil || Date.parse(offer.validUntil) >= Date.now());
  const costs = valid.map((offer) => offer.costUsd);
  const days = valid.map((offer) => offer.transitDays);
  const minCost = Math.min(...costs), maxCost = Math.max(...costs);
  const minDays = Math.min(...days), maxDays = Math.max(...days);
  const valueScore = (offer: QuoteOffer) => {
    const costPart = maxCost === minCost ? 0 : (offer.costUsd - minCost) / (maxCost - minCost);
    const dayPart = maxDays === minDays ? 0 : (offer.transitDays - minDays) / (maxDays - minDays);
    return costPart * 0.5 + dayPart * 0.5;
  };
  const best = [...valid].sort((a, b) => valueScore(a) - valueScore(b))[0];
  return {
    rfqId: rfq.rfqId,
    offers,
    estimateUsd,
    cheapest: valid.length ? valid.reduce((a, b) => (a.costUsd <= b.costUsd ? a : b)).forwarder : null,
    fastest: valid.length ? valid.reduce((a, b) => (a.transitDays <= b.transitDays ? a : b)).forwarder : null,
    bestValue: best?.forwarder ?? null,
    methodology: "ارزش بهترین گزینه، وزن مساوی هزینه و زمان نسبی بین همین پیشنهادها است؛ پیشنهاد منقضی نادیده گرفته می‌شود.",
    disclaimer: "این پیشنهادها را شما دستی ثبت کرده‌اید؛ سامانه نه نرخی از فورواردر می‌گیرد و نه صحت آن را تأیید می‌کند.",
  };
}
