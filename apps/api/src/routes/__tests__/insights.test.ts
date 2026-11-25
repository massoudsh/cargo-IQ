import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { buildRfqMessage, estimateDemurrage, estimateEmissions, plannedSchedule, suggestHsChapter } from "../../insights.js";
import type { Recommendation } from "../../types.js";

const shipment = { origin: "China", destination: "Iran", cargoType: "electronics", priority: "balanced" as const };

function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    decisionId: "dec_test", modelVersion: "rules-v2", confidence: 0.7,
    request: { ...shipment, incoterm: "FOB", pieces: 2, dimensionsCm: { length: 60, width: 40, height: 30 }, weightKg: 12 },
    measures: {
      volumeCbm: 0.144, actualWeightKg: 12,
      air: { volumetricKg: 24, chargeableKg: 24, basis: "volumetric" },
      seaLcl: { revenueTon: 0.144, basis: "volume" },
      road: { volumetricKg: 48, chargeableKg: 48, loadingMetres: 0.6, basis: "volumetric" },
    },
    options: [
      { forwarder: "Atlas Air", mode: "air", estimatedCostUsd: 9000, estimatedDeliveryDays: 5, delayRiskScore: 0.06, recommended: true, score: 1, scoreBreakdown: { cost: 0, time: 0, risk: 0, reliability: 0, routeMatch: 0, cargoMatch: 0, total: 1 }, reasons: [], estimateReviewAt: new Date(Date.now() + 1e9).toISOString() },
      { forwarder: "SilkRoute", mode: "sea", estimatedCostUsd: 4000, estimatedDeliveryDays: 26, delayRiskScore: 0.16, recommended: false, score: 0.5, scoreBreakdown: { cost: 0, time: 0, risk: 0, reliability: 0, routeMatch: 0, cargoMatch: 0, total: 0.5 }, reasons: [], estimateReviewAt: new Date(Date.now() + 1e9).toISOString() },
    ],
    constraintsApplied: [], createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("emissions estimate", () => {
  it("uses the corridor table for a known lane and flags the lowest emitter", () => {
    const result = estimateEmissions(recommendation());
    expect(result.distanceSource).toBe("corridor-table");
    expect(result.distanceKm).toBe(6200);
    // 24 kg payload, 6200 km: air 0.6 and sea 0.016 t-km factors.
    expect(result.estimates[0].co2eKg).toBeCloseTo(89.3, 1);
    expect(result.estimates[1].co2eKg).toBeCloseTo(2.4, 1);
    expect(result.lowest).toBe("SilkRoute");
  });

  it("prefers a user distance and reports unavailable lanes instead of guessing", () => {
    expect(estimateEmissions(recommendation(), 1000)).toMatchObject({ distanceSource: "user", distanceKm: 1000 });
    const unknown = estimateEmissions(recommendation({ request: { ...shipment, origin: "Peru", destination: "Japan" } }));
    expect(unknown.distanceSource).toBe("unavailable");
    expect(unknown.distanceKm).toBeNull();
    expect(unknown.estimates.every((estimate) => estimate.co2eKg === 0)).toBe(true);
    expect(unknown.lowest).toBeNull();
  });

  it("skips emission math when no cargo weight is known", () => {
    const empty = recommendation({ measures: { volumeCbm: 0, actualWeightKg: 0, air: { volumetricKg: 0, chargeableKg: 0, basis: "actual" }, seaLcl: { revenueTon: 0, basis: "volume" }, road: { volumetricKg: 0, chargeableKg: 0, loadingMetres: 0, basis: "actual" } } });
    expect(estimateEmissions(empty).estimates.every((estimate) => estimate.co2eKg === 0)).toBe(true);
  });
});

describe("planned schedule", () => {
  it("spreads milestones across the first option transit time and ends on delivery", () => {
    const schedule = plannedSchedule(recommendation());
    expect(schedule[0]).toMatchObject({ code: "registered", offsetDays: 0 });
    expect(schedule.at(-1)).toMatchObject({ code: "delivered", offsetDays: 5 });
    expect(schedule.every((item, index, all) => index === 0 || Date.parse(item.plannedAt) > Date.parse(all[index - 1].plannedAt))).toBe(true);
  });
});

describe("HS suggestion", () => {
  it("matches keywords in Persian and English but never claims certainty", () => {
    expect(suggestHsChapter("باتری لیتیوم")).toMatchObject({ chapter: "85", heading: "8507", confidence: "low" });
    expect(suggestHsChapter("electronics")).toMatchObject({ chapter: "85" });
    expect(suggestHsChapter("unknown widget")).toBeNull();
  });
});

describe("RFQ message", () => {
  it("carries the real route, measures, Incoterm and decision reference", () => {
    const message = buildRfqMessage(recommendation());
    expect(message).toContain("China به Iran");
    expect(message).toContain("0.144 CBM");
    expect(message).toContain("60×40×30 cm");
    expect(message).toContain("FOB");
    expect(message).toContain("dec_test");
  });
});

describe("demurrage estimate", () => {
  it("charges only the days beyond free time, per container", () => {
    const result = estimateDemurrage({ arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-15T00:00:00Z", freeDays: 7, dailyRateUsd: 50, containers: 2 });
    expect(result.chargedDays).toBe(7);
    expect(result.totalUsd).toBe(700);
  });

  it("returns zero when inside free time and rounds fractional rates", () => {
    expect(estimateDemurrage({ arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-05T00:00:00Z", freeDays: 7, dailyRateUsd: 50 }).totalUsd).toBe(0);
    expect(estimateDemurrage({ arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-04T00:00:00Z", freeDays: 1, dailyRateUsd: 10.333 }).totalUsd).toBe(20.67);
  });

  it.each([
    { arrivalDate: "nope", gateOutDate: "2026-11-15T00:00:00Z", freeDays: 7, dailyRateUsd: 50 },
    { arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-15T00:00:00Z", freeDays: -1, dailyRateUsd: 50 },
    { arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-15T00:00:00Z", freeDays: 1.5, dailyRateUsd: 50 },
    { arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-15T00:00:00Z", freeDays: 7, dailyRateUsd: -5 },
    { arrivalDate: "2026-11-01T00:00:00Z", gateOutDate: "2026-11-15T00:00:00Z", freeDays: 7, dailyRateUsd: 50, containers: 0 },
  ])("rejects malformed demurrage input %j", async (payload) => {
    expect((await request(createApp()).post("/api/insights/demurrage").send(payload)).status).toBe(400);
  });
});

describe("insights API", () => {
  it("returns emissions, schedule, HS and RFQ text for an owned decision", async () => {
    const app = createApp();
    const decision = await request(app).post("/api/shipments/recommend").send({ ...shipment, weightKg: 12, dimensionsCm: { length: 60, width: 40, height: 30 }, incoterm: "FOB" });
    const response = await request(app).get(`/api/insights/${decision.body.decisionId}`);
    expect(response.status).toBe(200);
    expect(response.body.emissions.distanceSource).toBe("corridor-table");
    expect(response.body.schedule).toHaveLength(5);
    expect(response.body.hs).toMatchObject({ chapter: "85" });
    expect(response.body.rfqMessage).toContain(decision.body.decisionId);
  });

  it("accepts a distance override and rejects a nonsensical one", async () => {
    const app = createApp();
    const decision = await request(app).post("/api/shipments/recommend").send(shipment);
    expect((await request(app).get(`/api/insights/${decision.body.decisionId}?distanceKm=1500`)).body.emissions).toMatchObject({ distanceSource: "user", distanceKm: 1500 });
    expect((await request(app).get(`/api/insights/${decision.body.decisionId}?distanceKm=0`)).status).toBe(400);
    expect((await request(app).get(`/api/insights/${decision.body.decisionId}?distanceKm=abc`)).status).toBe(400);
  });

  it("keeps insights private to their tenant", async () => {
    vi.stubEnv("CARGOIQ_API_KEYS", "org-a,org-b");
    const app = createApp();
    const decision = await request(app).post("/api/shipments/recommend").set("x-api-key", "org-a").send(shipment);
    expect((await request(app).get(`/api/insights/${decision.body.decisionId}`).set("x-api-key", "org-b")).status).toBe(404);
    expect((await request(app).get("/api/insights/dec_missing").set("x-api-key", "org-a")).status).toBe(404);
    vi.unstubAllEnvs();
  });
});
