import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DecisionStore } from "../decisionStore.js";
import type { MilestoneCode, TrackingRecord } from "../types.js";

const stages: MilestoneCode[] = ["registered", "picked-up", "in-transit", "customs", "delivered"];

export function createTrackingRouter(store: DecisionStore) {
  const router = Router();
  const records = new Map<string, TrackingRecord>();

  router.post("/", (req, res) => {
    const decisionId = req.body?.decisionId;
    if (typeof decisionId !== "string" || !store.getRecommendation(req.tenantId, decisionId)) {
      res.status(400).json({ error: { code: "INVALID_DECISION", message: "تصمیم معتبر لازم است." } });
      return;
    }
    const record: TrackingRecord = {
      trackingCode: `CIQ-${randomUUID()}`, decisionId, source: "manual",
      events: [{ code: "registered", occurredAt: new Date().toISOString() }],
    };
    records.set(`${req.tenantId}:${record.trackingCode}`, record);
    res.status(201).json(record);
  });

  router.get("/:trackingCode", (req, res) => {
    const record = records.get(`${req.tenantId}:${req.params.trackingCode}`);
    if (!record) {
      res.status(404).json({ error: { code: "TRACKING_NOT_FOUND", message: "رکورد رهگیری پیدا نشد." } });
      return;
    }
    res.json(record);
  });

  router.post("/:trackingCode/events", (req, res) => {
    const record = records.get(`${req.tenantId}:${req.params.trackingCode}`);
    if (!record) {
      res.status(404).json({ error: { code: "TRACKING_NOT_FOUND", message: "رکورد رهگیری پیدا نشد." } });
      return;
    }
    const nextStage = stages.indexOf(req.body?.code);
    if (nextStage !== stages.indexOf(record.events[record.events.length - 1].code) + 1) {
      res.status(400).json({ error: { code: "INVALID_MILESTONE", message: "فقط مرحلهٔ بعدی را پس از تأیید واقعی ثبت کنید." } });
      return;
    }
    record.events.push({ code: stages[nextStage], occurredAt: new Date().toISOString() });
    res.status(201).json(record);
  });

  return router;
}
