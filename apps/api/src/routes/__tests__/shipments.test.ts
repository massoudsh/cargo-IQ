import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

const app = createApp();

describe("shipment decision API", () => {
  it("creates an explainable recommendation and stores it in history", async () => {
    const response = await request(app).post("/api/shipments/recommend").send({ origin: "China", destination: "Iran", cargoType: "electronics", priority: "balanced", weightKg: 120 });
    expect(response.status).toBe(201);
    expect(response.body.decisionId).toMatch(/^dec_/);
    expect(response.body.modelVersion).toBe("rules-v1");
    expect(response.body.options).toHaveLength(3);
    expect(response.body.options[0].scoreBreakdown).toBeDefined();

    const history = await request(app).get("/api/shipments/history");
    expect(history.status).toBe(200);
    expect(history.body.decisions).toHaveLength(1);
  });

  it("accepts feedback only for a known decision", async () => {
    const recommendation = await request(app).post("/api/shipments/recommend").send({ origin: "China", destination: "Iran", cargoType: "electronics", priority: "balanced" });
    const feedback = await request(app).post(`/api/shipments/${recommendation.body.decisionId}/feedback`).send({ accepted: true, actualDeliveryDays: 24 });
    expect(feedback.status).toBe(201);
    expect(feedback.body.accepted).toBe(true);
  });

  it("imports route data and rejects invalid request payloads", async () => {
    const imported = await request(app).post("/api/imports/routes").send([{ origin: "China", destination: "Iran", cargoType: "electronics", forwarder: "Import Forwarder", mode: "sea", estimatedCostUsd: 3000, estimatedDeliveryDays: 20, delayRiskScore: 0.1, reliability: 0.95 }]);
    expect(imported.status).toBe(201);
    const invalid = await request(app).post("/api/shipments/recommend").send({ origin: "", destination: "Iran", cargoType: "electronics", priority: "fast", weightKg: -1 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("INVALID_REQUEST");
  });

  it("parses a constrained copilot request without external action", async () => {
    const response = await request(app).post("/api/copilot/recommend").send({ message: "از China به Iran برای electronics با هزینه کم" });
    expect(response.status).toBe(201);
    expect(response.body.constraintsApplied).toContain("human-approval-required");
  });

  it("preserves a supplied request ID for tracing", async () => {
    const response = await request(app).get("/health").set("x-request-id", "test-request-id");
    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBe("test-request-id");
  });
});
