import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

const app = createApp();

describe("POST /api/shipments/recommend", () => {
  it("returns ranked shipment options for a valid request", async () => {
    const response = await request(app).post("/api/shipments/recommend").send({
      origin: "China",
      destination: "Iran",
      cargoType: "electronics",
      priority: "balanced",
      weightKg: 120,
    });

    expect(response.status).toBe(200);
    expect(response.body.request.origin).toBe("China");
    expect(response.body.options).toHaveLength(3);
    expect(response.body.options[0].recommended).toBe(true);
    expect(response.body.options.slice(1).every((option: { recommended: boolean }) => !option.recommended)).toBe(true);
  });

  it("rejects invalid request payloads", async () => {
    const response = await request(app).post("/api/shipments/recommend").send({
      origin: "",
      destination: "Iran",
      cargoType: "electronics",
      priority: "fast",
      weightKg: -1,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("مشخصات محموله نامعتبر است.");
  });
});
