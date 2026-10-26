import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { calculateChargeableWeightKg } from "../../decisionEngine.js";

const shipment = { origin: "China", destination: "Iran", cargoType: "electronics", priority: "balanced" };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("chargeable air weight and packaging", () => {
  it("uses actual weight or volumetric weight, whichever is greater", () => {
    expect(calculateChargeableWeightKg({ ...shipment, priority: "balanced", weightKg: 5, dimensionsCm: { length: 60, width: 40, height: 30 }, pieces: 2 })).toBe(24);
    expect(calculateChargeableWeightKg({ ...shipment, priority: "balanced", weightKg: 30, dimensionsCm: { length: 60, width: 40, height: 30 } })).toBe(30);
    expect(calculateChargeableWeightKg({ ...shipment, priority: "balanced", volumeCbm: 0.144 })).toBe(24);
  });

  it("returns air-only chargeable weight and a seven-day internal review date", async () => {
    const response = await request(createApp()).post("/api/shipments/recommend").send({ ...shipment, weightKg: 10, volumeCbm: 0.3, incoterm: "FOB" });
    expect(response.status).toBe(201);
    for (const option of response.body.options) {
      expect(Date.parse(option.estimateReviewAt) - Date.parse(response.body.createdAt)).toBeGreaterThan(6 * 86400000);
      if (option.mode === "air") expect(option.chargeableWeightKg).toBe(50);
      else expect(option.chargeableWeightKg).toBeUndefined();
    }
  });

  it.each([
    { dimensionsCm: { length: 10, width: 5 } },
    { dimensionsCm: { length: 0, width: 5, height: 10 } },
    { dimensionsCm: { length: 10001, width: 5, height: 10 } },
    { pieces: 1.5 }, { pieces: -1 }, { pieces: 10001 }, { incoterm: "INVALID" },
  ])("rejects malformed packaging %j", async (packaging) => {
    const response = await request(createApp()).post("/api/shipments/recommend").send({ ...shipment, ...packaging });
    expect(response.status).toBe(400);
  });
});

describe("tenant-scoped RFQ drafts", () => {
  it("stores a local draft, validates candidates, isolates tenants, and derives expiry", async () => {
    vi.stubEnv("CARGOIQ_API_KEYS", "test-org-a,test-org-b");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
    const app = createApp();
    const decision = await request(app).post("/api/shipments/recommend").set("x-api-key", "test-org-a").send(shipment);
    const body = { decisionId: decision.body.decisionId, forwarders: [decision.body.options[0].forwarder] };
    const draft = await request(app).post("/api/quotes/request").set("x-api-key", "test-org-a").send(body);
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe("draft");
    expect(await request(app).get(`/api/quotes/${draft.body.rfqId}`).set("x-api-key", "test-org-b")).toHaveProperty("status", 404);
    expect(await request(app).post("/api/quotes/request").set("x-api-key", "test-org-b").send(body)).toHaveProperty("status", 400);
    expect(await request(app).post("/api/quotes/request").set("x-api-key", "test-org-a").send({ ...body, forwarders: ["unknown"] })).toHaveProperty("status", 400);
    vi.setSystemTime(new Date("2026-10-30T00:00:00Z"));
    const expired = await request(app).get(`/api/quotes/${draft.body.rfqId}`).set("x-api-key", "test-org-a");
    expect(expired.body.status).toBe("expired");
    vi.setSystemTime(new Date("2026-11-03T00:00:00Z"));
    expect(await request(app).post("/api/quotes/request").set("x-api-key", "test-org-a").send(body)).toHaveProperty("status", 409);
  });
});

describe("manual tracking, not simulated carrier events", () => {
  it("requires an owned decision and advances only through confirmed stages", async () => {
    vi.stubEnv("CARGOIQ_API_KEYS", "test-org-a,test-org-b");
    const app = createApp();
    expect(await request(app).get("/api/tracking/CIQ-NOT-REAL").set("x-api-key", "test-org-a")).toHaveProperty("status", 404);
    expect(await request(app).post("/api/tracking").set("x-api-key", "test-org-a").send({ decisionId: "missing" })).toHaveProperty("status", 400);
    const decision = await request(app).post("/api/shipments/recommend").set("x-api-key", "test-org-a").send(shipment);
    const record = await request(app).post("/api/tracking").set("x-api-key", "test-org-a").send({ decisionId: decision.body.decisionId });
    expect(record.status).toBe(201);
    expect(record.body.source).toBe("manual");
    expect(record.body.events).toHaveLength(1);
    const path = `/api/tracking/${record.body.trackingCode}`;
    expect(await request(app).get(path).set("x-api-key", "test-org-b")).toHaveProperty("status", 404);
    expect(await request(app).post(`${path}/events`).set("x-api-key", "test-org-b").send({ code: "picked-up" })).toHaveProperty("status", 404);
    expect(await request(app).post(`${path}/events`).set("x-api-key", "test-org-a").send({ code: "delivered" })).toHaveProperty("status", 400);
    for (const code of ["picked-up", "in-transit", "customs", "delivered"]) {
      const updated = await request(app).post(`${path}/events`).set("x-api-key", "test-org-a").send({ code });
      expect(updated.status).toBe(201);
      expect(updated.body.events.at(-1).code).toBe(code);
    }
    expect(await request(app).post(`${path}/events`).set("x-api-key", "test-org-a").send({ code: "delivered" })).toHaveProperty("status", 400);
  });
});

describe("customs preparation checklist", () => {
  it("flags known categories without clearing other cargo as safe", async () => {
    const app = createApp();
    const hazardous = await request(app).post("/api/compliance/check").send({ ...shipment, cargoType: "باتری لیتیوم" });
    expect(hazardous.body.checks.find((check: { code: string }) => check.code === "dangerous-goods").status).toBe("required");
    const medical = await request(app).post("/api/compliance/check").send({ ...shipment, cargoType: "تجهیزات پزشکی" });
    expect(medical.body.checks.find((check: { code: string }) => check.code === "health-permit").status).toBe("required");
    const general = await request(app).post("/api/compliance/check").send(shipment);
    expect(general.body.checks.some((check: { status: string }) => check.status === "clear")).toBe(false);
    expect(general.body.disclaimer).toBeTruthy();
    expect(await request(app).post("/api/compliance/check").send({ cargoType: "parts" })).toHaveProperty("status", 400);
  });
});

it("keeps imported candidates private to their tenant", async () => {
  vi.stubEnv("CARGOIQ_API_KEYS", "test-org-a,test-org-b");
  const app = createApp();
  const imported = await request(app).post("/api/imports/routes").set("x-api-key", "test-org-a").send([{ ...shipment, forwarder: "Private Test Forwarder", mode: "air", estimatedCostUsd: 1, estimatedDeliveryDays: 1, delayRiskScore: 0, reliability: 1 }]);
  expect(imported.status).toBe(201);
  const a = await request(app).post("/api/shipments/recommend").set("x-api-key", "test-org-a").send(shipment);
  const b = await request(app).post("/api/shipments/recommend").set("x-api-key", "test-org-b").send(shipment);
  expect(a.body.options.some((option: { forwarder: string }) => option.forwarder === "Private Test Forwarder")).toBe(true);
  expect(b.body.options.some((option: { forwarder: string }) => option.forwarder === "Private Test Forwarder")).toBe(false);
});
