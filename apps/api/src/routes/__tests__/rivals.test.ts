import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { calculateFreightMeasures } from "../../freightMeasures.js";

const shipment = { origin: "China", destination: "Iran", cargoType: "electronics", priority: "balanced" };

async function decisionFor(app: ReturnType<typeof createApp>, extra: Record<string, unknown> = {}, key?: string) {
  const call = request(app).post("/api/shipments/recommend");
  if (key) call.set("x-api-key", key);
  const response = await call.send({ ...shipment, ...extra });
  expect(response.status).toBe(201);
  return response.body;
}

describe("multi-mode freight measures", () => {
  it("computes air, LCL revenue ton and road bases from one cargo description", () => {
    const measures = calculateFreightMeasures({ ...shipment, priority: "balanced", weightKg: 1200, dimensionsCm: { length: 120, width: 100, height: 100 }, pieces: 2 });
    // 2.4 CBM -> 400 volumetric kg, so actual weight wins for air.
    expect(measures.volumeCbm).toBeCloseTo(2.4);
    expect(measures.air.volumetricKg).toBeCloseTo(400);
    expect(measures.air.chargeableKg).toBe(1200);
    expect(measures.air.basis).toBe("actual");
    // 2.4 CBM vs 1.2 t -> volume basis for LCL.
    expect(measures.seaLcl.revenueTon).toBeCloseTo(2.4);
    expect(measures.seaLcl.basis).toBe("volume");
    // 1.2 m x 1.0 m over a 2.4 m wide trailer, twice.
    expect(measures.road.loadingMetres).toBeCloseTo(1);
  });

  it("prefers dimensions over total volume and falls back to zero when absent", () => {
    expect(calculateFreightMeasures({ ...shipment, priority: "balanced", volumeCbm: 9, dimensionsCm: { length: 60, width: 40, height: 30 } }).volumeCbm).toBeCloseTo(0.072);
    expect(calculateFreightMeasures({ ...shipment, priority: "balanced" })).toMatchObject({ volumeCbm: 0, air: { chargeableKg: 0 }, seaLcl: { revenueTon: 0 } });
  });

  it("returns a billing unit per option and cargo measures on the decision", async () => {
    const decision = await decisionFor(createApp(), { weightKg: 10, dimensionsCm: { length: 60, width: 40, height: 30 }, pieces: 2 });
    expect(decision.measures.volumeCbm).toBeCloseTo(0.144);
    const air = decision.options.find((option: { mode: string }) => option.mode === "air");
    expect(air.billing).toEqual({ unit: "kg", value: 24, basis: "volumetric-weight" });
    for (const option of decision.options) expect(["kg", "revenue-ton", "ldm"]).toContain(option.billing.unit);
  });
});

describe("landed cost estimator", () => {
  it("adds freight and insurance to customs value for FOB and totals once", async () => {
    const app = createApp();
    const decision = await decisionFor(app, { incoterm: "FOB" });
    const response = await request(app).post("/api/landed-cost/estimate").send({ decisionId: decision.decisionId, declaredValueUsd: 10000, freightUsd: 1000, insuranceRatePct: 0.5, dutyRatePct: 10, vatRatePct: 9 });
    expect(response.status).toBe(200);
    // Insurance = 0.5% of (10000 + 1000) = 55; customs value = 11055.
    expect(response.body.customsValueUsd).toBe(11055);
    expect(response.body.lines.find((line: { code: string }) => line.code === "duty").amountUsd).toBe(1105.5);
    expect(response.body.lines.find((line: { code: string }) => line.code === "vat").amountUsd).toBe(1094.45);
    expect(response.body.totalUsd).toBe(13254.95);
    expect(response.body.totalIrr).toBeUndefined();
  });

  it("does not count CIF freight twice", async () => {
    const app = createApp();
    const decision = await decisionFor(app, { incoterm: "CIF" });
    const response = await request(app).post("/api/landed-cost/estimate").send({ decisionId: decision.decisionId, declaredValueUsd: 10000, freightUsd: 1000, dutyRatePct: 10 });
    const freight = response.body.lines.find((line: { code: string }) => line.code === "freight");
    expect(freight).toMatchObject({ amountUsd: 1000, counted: false });
    expect(response.body.customsValueUsd).toBe(10000);
    expect(response.body.totalUsd).toBe(11000);
  });

  it("converts the rial total only when an FX rate is supplied", async () => {
    const app = createApp();
    const decision = await decisionFor(app, { incoterm: "FOB" });
    const response = await request(app).post("/api/landed-cost/estimate").send({ decisionId: decision.decisionId, declaredValueUsd: 1000, freightUsd: 100, insuranceRatePct: 0, fxRateIrrPerUsd: 50 });
    expect(response.body.totalIrr).toBe(Math.round(response.body.totalUsd * 50));
  });

  it.each([
    { declaredValueUsd: -1 }, { declaredValueUsd: 10, dutyRatePct: 101 }, { declaredValueUsd: 10, fxRateIrrPerUsd: 0 }, { declaredValueUsd: "10" },
  ])("rejects invalid money or rates %j", async (payload) => {
    const app = createApp();
    const decision = await decisionFor(app);
    expect((await request(app).post("/api/landed-cost/estimate").send({ decisionId: decision.decisionId, ...payload })).status).toBe(400);
  });

  it("rejects unknown and foreign decisions", async () => {
    vi.stubEnv("CARGOIQ_API_KEYS", "org-a,org-b");
    const app = createApp();
    const decision = await decisionFor(app, {}, "org-a");
    expect((await request(app).post("/api/landed-cost/estimate").set("x-api-key", "org-b").send({ decisionId: decision.decisionId, declaredValueUsd: 10 })).status).toBe(400);
    vi.unstubAllEnvs();
  });
});

describe("recorded forwarder offers", () => {
  async function draft(app: ReturnType<typeof createApp>) {
    const decision = await decisionFor(app);
    const rfq = await request(app).post("/api/quotes/request").send({ decisionId: decision.decisionId, forwarders: decision.options.map((option: { forwarder: string }) => option.forwarder) });
    return { decision, rfq: rfq.body };
  }

  it("ranks only offers that belong to the RFQ and ignores expired ones", async () => {
    const app = createApp();
    const { rfq } = await draft(app);
    const [first, second] = rfq.forwarders;
    await request(app).post(`/api/quotes/${rfq.rfqId}/offers`).send({ forwarder: first, costUsd: 4200, transitDays: 20 });
    await request(app).post(`/api/quotes/${rfq.rfqId}/offers`).send({ forwarder: second, costUsd: 5000, transitDays: 10 });
    await request(app).post(`/api/quotes/${rfq.rfqId}/offers`).send({ forwarder: first, costUsd: 100, transitDays: 99, validUntil: "2020-01-01T00:00:00Z" });
    const comparison = await request(app).get(`/api/quotes/${rfq.rfqId}/offers`);
    expect(comparison.status).toBe(200);
    const live = comparison.body.offers.filter((offer: { validUntil?: string }) => !offer.validUntil);
    expect(comparison.body.cheapest).toBe(live.reduce((a: { costUsd: number }, b: { costUsd: number }) => (a.costUsd <= b.costUsd ? a : b)).forwarder);
    expect(comparison.body.fastest).toBe(live.reduce((a: { transitDays: number }, b: { transitDays: number }) => (a.transitDays <= b.transitDays ? a : b)).forwarder);
    expect(comparison.body.estimateUsd).toBeTypeOf("number");
  });

  it("replaces a resubmitted offer for the same forwarder", async () => {
    const app = createApp();
    const { rfq } = await draft(app);
    const forwarder = rfq.forwarders[0];
    await request(app).post(`/api/quotes/${rfq.rfqId}/offers`).send({ forwarder, costUsd: 100, transitDays: 5 });
    await request(app).post(`/api/quotes/${rfq.rfqId}/offers`).send({ forwarder, costUsd: 200, transitDays: 6 });
    const comparison = await request(app).get(`/api/quotes/${rfq.rfqId}/offers`);
    expect(comparison.body.offers.filter((offer: { forwarder: string }) => offer.forwarder === forwarder)).toHaveLength(1);
    expect(comparison.body.offers.find((offer: { forwarder: string }) => offer.forwarder === forwarder).costUsd).toBe(200);
  });

  it.each([
    { forwarder: "Unknown Forwarder", costUsd: 1, transitDays: 1 },
    { costUsd: 1, transitDays: 1 },
    { forwarder: "FIRST", costUsd: -1, transitDays: 1 },
    { forwarder: "FIRST", costUsd: 1, transitDays: 99999 },
    { forwarder: "FIRST", costUsd: 1, transitDays: 1, validUntil: "not-a-date" },
  ])("rejects malformed offer %j", async (payload) => {
    const app = createApp();
    const { rfq } = await draft(app);
    const body = { ...payload, forwarder: payload.forwarder === "FIRST" ? rfq.forwarders[0] : payload.forwarder };
    expect((await request(app).post(`/api/quotes/${rfq.rfqId}/offers`).send(body)).status).toBe(400);
  });

  it("keeps offers private to their tenant", async () => {
    vi.stubEnv("CARGOIQ_API_KEYS", "org-a,org-b");
    const app = createApp();
    const decision = await decisionFor(app, {}, "org-a");
    const rfq = await request(app).post("/api/quotes/request").set("x-api-key", "org-a").send({ decisionId: decision.decisionId, forwarders: [decision.options[0].forwarder] });
    expect((await request(app).get(`/api/quotes/${rfq.body.rfqId}/offers`).set("x-api-key", "org-b")).status).toBe(404);
    expect((await request(app).post(`/api/quotes/${rfq.body.rfqId}/offers`).set("x-api-key", "org-b").send({ forwarder: decision.options[0].forwarder, costUsd: 1, transitDays: 1 })).status).toBe(404);
    vi.unstubAllEnvs();
  });
});

describe("document readiness", () => {
  it("persists a prepared flag per decision and counts outstanding required items", async () => {
    const app = createApp();
    const decision = await decisionFor(app, { cargoType: "lithium battery" });
    const initial = await request(app).get(`/api/compliance/readiness/${decision.decisionId}`);
    expect(initial.status).toBe(200);
    expect(initial.body.outstandingRequired).toBe(3);
    const marked = await request(app).post(`/api/compliance/readiness/${decision.decisionId}`).send({ code: "commercial-invoice", prepared: true });
    expect(marked.body.outstandingRequired).toBe(2);
    const again = await request(app).get(`/api/compliance/readiness/${decision.decisionId}`);
    expect(again.body.checks.find((check: { code: string }) => check.code === "commercial-invoice")).toMatchObject({ prepared: true });
    const cleared = await request(app).post(`/api/compliance/readiness/${decision.decisionId}`).send({ code: "commercial-invoice", prepared: false });
    expect(cleared.body.outstandingRequired).toBe(3);
  });

  it("rejects unknown codes, unknown decisions and foreign decisions", async () => {
    vi.stubEnv("CARGOIQ_API_KEYS", "org-a,org-b");
    const app = createApp();
    const decision = await decisionFor(app, {}, "org-a");
    expect((await request(app).post(`/api/compliance/readiness/${decision.decisionId}`).set("x-api-key", "org-a").send({ code: "made-up", prepared: true })).status).toBe(400);
    expect((await request(app).post(`/api/compliance/readiness/${decision.decisionId}`).set("x-api-key", "org-a").send({ code: "packing-list", prepared: "yes" })).status).toBe(400);
    expect((await request(app).get("/api/compliance/readiness/dec_missing").set("x-api-key", "org-a")).status).toBe(404);
    expect((await request(app).get(`/api/compliance/readiness/${decision.decisionId}`).set("x-api-key", "org-b")).status).toBe(404);
    vi.unstubAllEnvs();
  });
});
