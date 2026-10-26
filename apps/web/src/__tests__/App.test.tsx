import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import type { RecommendResponse } from "../types";

function decision(reviewAt = new Date(Date.now() + 7 * 86400000).toISOString()): RecommendResponse {
  return {
    decisionId: "dec_test", modelVersion: "rules-v2", confidence: 0.82,
    request: { origin: "China", destination: "Iran", cargoType: "electronics", priority: "balanced" },
    constraintsApplied: ["priority:balanced"], createdAt: new Date().toISOString(),
    options: [{
      forwarder: "Atlas Test Cargo", mode: "air", estimatedCostUsd: 3900, estimatedDeliveryDays: 6,
      delayRiskScore: 0.16, chargeableWeightKg: 24, estimateReviewAt: reviewAt, score: 0.82,
      scoreBreakdown: { cost: 0.2, time: 0.3, risk: 0.2, reliability: 0.1, routeMatch: 0.02, cargoMatch: 0, total: 0.82 },
      reasons: ["تطبیق مسیر"], recommended: true,
    }],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function submitShipment() {
  fireEvent.change(screen.getByLabelText("مبدأ"), { target: { value: "China" } });
  fireEvent.change(screen.getByLabelText("مقصد"), { target: { value: "Iran" } });
  fireEvent.change(screen.getByLabelText("نوع کالا"), { target: { value: "electronics" } });
  fireEvent.click(screen.getByRole("button", { name: "دریافت پیشنهاد بهترین گزینه" }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("shipment comparison", () => {
  it("renders estimate disclosures, air weight, and a local RFQ draft", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(decision(), 201))
      .mockResolvedValueOnce(json({ rfqId: "rfq_test", status: "draft", expiresAt: new Date().toISOString() }, 201));
    render(<App />);
    submitShipment();
    expect(await screen.findByText("Atlas Test Cargo")).toBeInTheDocument();
    expect(screen.getByText("24.0 کیلوگرم")).toBeInTheDocument();
    expect(screen.getByText(/احتمال آماری یا تضمین نیست/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ساخت پیش‌نویس استعلام چندفورواردر" }));
    expect(await screen.findByText(/به هیچ فورواردر ارسال نشده است/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "پیش‌نویس استعلام ثبت شد" })).toBeDisabled();
    expect(fetch).toHaveBeenLastCalledWith("/api/quotes/request", expect.objectContaining({ body: JSON.stringify({ decisionId: "dec_test", forwarders: ["Atlas Test Cargo"] }) }));
  });

  it("shows network errors and allows retrying an RFQ", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(decision(), 201)).mockRejectedValueOnce(new Error("offline"));
    render(<App />);
    submitShipment();
    await screen.findByText("Atlas Test Cargo");
    fireEvent.click(screen.getByRole("button", { name: "ساخت پیش‌نویس استعلام چندفورواردر" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    expect(screen.getByRole("button", { name: "ساخت پیش‌نویس استعلام چندفورواردر" })).toBeEnabled();
  });

  it("shows the existing recommendation error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({}, 500));
    render(<App />);
    submitShipment();
    expect(await screen.findByRole("alert")).toHaveTextContent("دریافت پیشنهاد با خطا مواجه شد. دوباره تلاش کنید.");
  });

  it("includes dimensions, fractional volume and Incoterms in the same request", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(decision(), 201));
    render(<App />);
    fireEvent.change(screen.getByLabelText("حجم کل (متر مکعب)"), { target: { value: "0.144" } });
    fireEvent.change(screen.getByLabelText("تعداد بسته"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("طول هر بسته (سانتی‌متر)"), { target: { value: "60" } });
    const width = screen.getByLabelText("عرض هر بسته (سانتی‌متر)");
    expect(width).toBeRequired();
    fireEvent.invalid(width);
    expect(width.closest("details")).toHaveAttribute("open");
    fireEvent.change(width, { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("ارتفاع هر بسته (سانتی‌متر)"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("اینکوترمز"), { target: { value: "FOB" } });
    submitShipment();
    await screen.findByText("Atlas Test Cargo");
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual(expect.objectContaining({ pieces: 2, volumeCbm: 0.144, dimensionsCm: { length: 60, width: 40, height: 30 }, incoterm: "FOB" }));
  });
});

describe("history and operational tools", () => {
  it("restores stale decisions from history and prevents a stale RFQ", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ decisions: [decision("2020-01-01T00:00:00Z")] }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "تازه‌سازی تاریخچهٔ این سازمان" }));
    fireEvent.click(await screen.findByRole("button", { name: /China ← Iran/ }));
    expect(screen.getByText(/این برآورد نیازمند بازبینی است/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ساخت پیش‌نویس استعلام چندفورواردر" })).toBeDisabled();
  });

  it("shows an explicit empty history", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ decisions: [] }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "تازه‌سازی تاریخچهٔ این سازمان" }));
    expect(await screen.findByText("هنوز تصمیمی ثبت نشده است.")).toBeInTheDocument();
  });

  it("reports unknown tracking codes instead of inventing events", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ error: { message: "رکورد رهگیری پیدا نشد." } }, 404));
    render(<App />);
    fireEvent.change(screen.getByLabelText("کد پیگیری داخلی"), { target: { value: "CIQ-unknown" } });
    fireEvent.click(screen.getByRole("button", { name: "جست‌وجوی پیگیری" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("رکورد رهگیری پیدا نشد.");
    expect(screen.queryByText("دریافت کالا")).not.toBeInTheDocument();
  });

  it("creates manual tracking and uses the selected route for customs checks", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(decision(), 201))
      .mockResolvedValueOnce(json({ trackingCode: "CIQ-test", decisionId: "dec_test", source: "manual", events: [{ code: "registered", occurredAt: new Date().toISOString() }] }, 201))
      .mockResolvedValueOnce(json({ checks: [{ code: "invoice", title: "فاکتور تجاری", status: "required", guidance: "مدارک آماده شود" }], disclaimer: "تأیید قانونی نیست" }));
    render(<App />);
    submitShipment();
    await screen.findByText("Atlas Test Cargo");
    fireEvent.click(screen.getByRole("button", { name: "شروع پیگیری دستی این تصمیم" }));
    expect(await screen.findByRole("button", { name: "تأیید دستی: دریافت کالا" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بررسی مدارک این محموله" }));
    expect(await screen.findByText("تأیید قانونی نیست")).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith("/api/compliance/check", expect.objectContaining({ body: JSON.stringify(decision().request) }));
  });
});
