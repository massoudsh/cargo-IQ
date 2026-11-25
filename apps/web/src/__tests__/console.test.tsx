import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "../components/AppShell";
import GlassSurface from "../components/GlassSurface";
import DecisionWorkspace from "../components/DecisionWorkspace";
import ShipmentForm from "../components/ShipmentForm";
import LandedCostPanel from "../components/LandedCostPanel";
import OffersPanel from "../components/OffersPanel";
import TradeTools from "../components/TradeTools";
import ShipmentResults from "../components/ShipmentResults";
import InsightsPanel from "../components/InsightsPanel";
import { csvCell, decisionCsv, filterDecisions, type DecisionFilters } from "../decisionReport";
import { ApiError, requestJson } from "../api";
import type { RecommendResponse } from "../types";

const filters: DecisionFilters = { query: "", from: "", to: "", status: "all", order: "newest" };
function decision(index: number): RecommendResponse {
  return {
    decisionId: `dec_${index}`, modelVersion: "rules-v2", confidence: 0.5,
    request: { origin: index % 2 ? "China" : "Turkey", destination: "Iran", cargoType: "parts", priority: "balanced" },
    constraintsApplied: [], createdAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
    measures: { volumeCbm: 0, actualWeightKg: 0, air: { volumetricKg: 0, chargeableKg: 0, basis: "actual" }, seaLcl: { revenueTon: 0, basis: "volume" }, road: { volumetricKg: 0, chargeableKg: 0, loadingMetres: 0, basis: "actual" } },
    options: [{ forwarder: "Test Forwarder", mode: "air", estimatedCostUsd: 100, estimatedDeliveryDays: 5, delayRiskScore: 0.1, recommended: true, score: 1, reasons: [], estimateReviewAt: index % 2 ? "2099-01-01T00:00:00Z" : "2020-01-01T00:00:00Z", scoreBreakdown: { cost: 0, time: 0, risk: 0, reliability: 0, routeMatch: 0, cargoMatch: 0, total: 0 } }],
  };
}

afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.lang = "fa";
  document.documentElement.dir = "rtl";
});

describe("decision reporting", () => {
  it("filters query, date and review state and sorts without mutating history", () => {
    const data = [decision(0), decision(1), decision(2)];
    const now = Date.parse("2026-10-31");
    expect(filterDecisions(data, { ...filters, query: " CHINA " }, now).map((item) => item.decisionId)).toEqual(["dec_1"]);
    expect(filterDecisions(data, { ...filters, from: "2026-01-02", to: "2026-01-03", status: "review" }, now).map((item) => item.decisionId)).toEqual(["dec_2"]);
    expect(filterDecisions(data, { ...filters, order: "oldest" }, now)[0].decisionId).toBe("dec_0");
    expect(data[0].decisionId).toBe("dec_0");
  });
  it.each(["=SUM(1,2)", " +cmd", "-1+2", "@SUM(1)", "\tformula", "\rtext", "\ntext", "\uFEFF=1"])("neutralizes spreadsheet formula input %j", (value) => {
    expect(csvCell(value)).toMatch(/^"'/);
  });
  it("escapes CSV quotes and includes scope, timestamp and filters", () => {
    const data = decision(0); data.request.origin = 'city,"port"';
    const csv = decisionCsv([data], filters, "2026-10-31T00:00:00Z");
    expect(csv).toContain('"city,""port"""');
    expect(csv).toContain("Current tenant history");
    expect(csv).toContain("2026-10-31T00:00:00Z");
    expect(csv).toContain("Filters");
    expect(csv).not.toContain("dec_1");
  });
});

describe("operations workspace", () => {
  it("shows unknown counts until history is loaded rather than fabricated zeros", () => {
    render(<DecisionWorkspace decisions={[]} loaded={false} busy={false} onReload={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /تصمیم‌های ثبت‌شده/ })).toBeDisabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("paginates, filters review queues and selects the actual record", () => {
    const select = vi.fn();
    render(<DecisionWorkspace decisions={Array.from({ length: 12 }, (_, index) => decision(index))} loaded busy={false} onReload={vi.fn()} onSelect={select} />);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(11);
    fireEvent.click(screen.getByRole("button", { name: "صفحهٔ بعد" }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /نیازمند بازبینی داخلی/ }));
    expect(screen.getByLabelText("وضعیت بازبینی")).toHaveValue("review");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dec_0" } });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Turkey ← Iran/ }));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ decisionId: "dec_0" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/نتیجه‌ای مطابق فیلترها پیدا نشد/)).toBeInTheDocument();
  });
  it("exports only filtered results and reports download handoff", () => {
    const create = vi.fn(() => "blob:test");
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DecisionWorkspace decisions={[decision(0), decision(1)]} loaded busy={false} onReload={vi.fn()} onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "China" } });
    fireEvent.click(screen.getByRole("button", { name: "دریافت گزارش CSV همین نتایج" }));
    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByText(/به مرورگر تحویل شد/)).toBeInTheDocument();
  });
  it("allows retry after an export failure", () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => { throw new Error("unavailable"); }) });
    render(<DecisionWorkspace decisions={[decision(0)]} loaded busy={false} onReload={vi.fn()} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "دریافت گزارش CSV همین نتایج" }));
    expect(screen.getByText(/آماده‌سازی گزارش ناموفق بود/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "دریافت گزارش CSV همین نتایج" })).toBeEnabled();
  });
});

describe("shell and accessible primitives", () => {
  it.each(["rtl", "ltr"])("keeps landmarks and navigation semantics in %s", (dir) => {
    document.documentElement.dir = dir;
    render(<AppShell><GlassSurface id="plan" variant="elevated" aria-label="Plan" tabIndex={-1}>Content</GlassSurface></AppShell>);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Plan" })).toHaveClass("glass-elevated");
    fireEvent.click(screen.getByRole("link", { name: "برنامه‌ریزی حمل" }));
    expect(screen.getByRole("link", { name: "برنامه‌ریزی حمل" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("region", { name: "Plan" })).toHaveFocus();
  });
  it("restores theme and persists toggles", () => {
    localStorage.setItem("cargoiq-theme", "dark");
    render(<AppShell>Content</AppShell>);
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "حالت تاریک" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("cargoiq-theme")).toBe("light");
  });
  it("uses OS theme when no preference is saved", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<AppShell>Content</AppShell>);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("closes the navigation disclosure with Escape and restores focus", () => {
    render(<AppShell>Content</AppShell>);
    const button = screen.getByRole("button", { name: "فهرست" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });
  it("shows an offline notice", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole("status")).toHaveTextContent("اتصال اینترنت قطع است");
  });
  it("retains form input and links validation errors to hidden packaging fields", async () => {
    const submit = vi.fn(); render(<ShipmentForm loading={false} onSubmit={submit} />);
    fireEvent.change(screen.getByLabelText("مبدأ"), { target: { value: "China" } });
    fireEvent.change(screen.getByLabelText("طول هر بسته (سانتی‌متر)"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "دریافت پیشنهاد بهترین گزینه" }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("مبدأ")).toHaveValue("China");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /عرض هر بسته/ }));
    expect(screen.getByLabelText("عرض هر بسته (سانتی‌متر)")).toHaveFocus();
    expect(screen.getByLabelText("عرض هر بسته (سانتی‌متر)").closest("details")).toHaveAttribute("open");
  });
});

describe("actionable API errors", () => {
  it.each([401, 403, 429, 500])("does not expose server details for HTTP %i", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { message: "internal detail" } }), { status }));
    await expect(requestJson("/test")).rejects.toBeInstanceOf(ApiError);
    await expect(requestJson("/test")).rejects.not.toThrow("internal detail");
  });
  it("provides English network recovery instructions when the document is English", async () => {
    document.documentElement.lang = "en";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await expect(requestJson("/test")).rejects.toThrow("Check your connection");
  });
});

describe("rival-inspired pricing and document panels", () => {
  const base = decision(1);
  it("shows the landed-cost total and marks freight excluded when the Incoterm already includes it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      decisionId: "dec_1", incoterm: "CIF", customsValueUsd: 1000,
      lines: [
        { code: "goods", label: "ارزش کالا", amountUsd: 1000, counted: true, note: "بر پایهٔ CIF" },
        { code: "freight", label: "کرایهٔ بین‌المللی", amountUsd: 200, counted: false, note: "در قیمت کالا لحاظ شده" },
      ],
      totalUsd: 1000, totalIrr: 50000000, assumptions: [], disclaimer: "برآورد برنامه‌ریزی است",
    }), { headers: { "Content-Type": "application/json" } }));
    render(<LandedCostPanel decision={base} fxRate={50000} onFxRate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("ارزش کالا در فاکتور (دلار)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "محاسبهٔ هزینهٔ نهایی" }));
    expect(await screen.findByText(/برآورد برنامه‌ریزی است/)).toBeInTheDocument();
    const freightRow = screen.getByText("کرایهٔ بین‌المللی").closest("tr");
    expect(freightRow).toHaveClass("excluded");
    expect(screen.getByText(/۵۰٬۰۰۰٬۰۰۰/)).toBeInTheDocument();
  });

  it("records a forwarder offer and shows the best-value marker", async () => {
    const rfq = { rfqId: "rfq_1", decisionId: "dec_1", forwarders: ["Alpha", "Beta"], status: "draft" as const, expiresAt: "2099-01-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" };
    const comparison = {
      rfqId: "rfq_1", estimateUsd: 3900,
      offers: [
        { rfqId: "rfq_1", forwarder: "Alpha", costUsd: 4000, transitDays: 20, recordedAt: "2026-01-01T00:00:00Z" },
        { rfqId: "rfq_1", forwarder: "Beta", costUsd: 5000, transitDays: 10, recordedAt: "2026-01-01T00:00:00Z" },
      ],
      cheapest: "Alpha", fastest: "Beta", bestValue: "Alpha", methodology: "وزن مساوی هزینه و زمان", disclaimer: "دستی ثبت شده",
    };
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(comparison), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 201, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(comparison), { headers: { "Content-Type": "application/json" } }));
    render(<OffersPanel rfq={rfq} />);
    await screen.findByText("Alpha");
    fireEvent.change(screen.getByLabelText("هزینه (دلار)"), { target: { value: "4200" } });
    fireEvent.change(screen.getByLabelText("زمان تحویل (روز)"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "ثبت پیشنهاد" }));
    await screen.findByText("بهترین تعادل");
    expect(fetch).toHaveBeenCalledWith("/api/quotes/rfq_1/offers", expect.objectContaining({ body: JSON.stringify({ forwarder: "Alpha", costUsd: 4200, transitDays: 18 }) }));
  });

  it("toggles a document as prepared and updates the outstanding count", async () => {
    const readiness = {
      decisionId: "dec_1",
      checks: [{ code: "packing-list", title: "فهرست بسته‌بندی", status: "required", guidance: "آماده کنید", prepared: false }],
      outstandingRequired: 1, disclaimer: "علامت دستی است",
    };
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(readiness), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...readiness, checks: [{ ...readiness.checks[0], prepared: true }], outstandingRequired: 0 }), { headers: { "Content-Type": "application/json" } }));
    render(<TradeTools decision={decision(1)} />);
    const box = await screen.findByRole("checkbox", { name: /فهرست بسته‌بندی/ });
    fireEvent.click(box);
    expect(await screen.findByText(/۰ مورد الزامی/)).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith("/api/compliance/readiness/dec_1", expect.objectContaining({ body: JSON.stringify({ code: "packing-list", prepared: true }) }));
  });

  it("shows a rial equivalent only when an FX rate is supplied", () => {
    cleanup();
    render(<ShipmentResults options={base.options} onRequestQuotes={vi.fn()} requestPending={false} rfqCreated={false} fxRate={2} />);
    expect(screen.getByText(/ریال/)).toBeInTheDocument();
    cleanup();
    render(<ShipmentResults options={base.options} onRequestQuotes={vi.fn()} requestPending={false} rfqCreated={false} />);
    expect(screen.queryByText(/ریال/)).not.toBeInTheDocument();
  });
});

describe("trip insights panel", () => {
  const insights = {
    decisionId: "dec_1",
    emissions: {
      decisionId: "dec_1", distanceKm: 6200, distanceSource: "corridor-table" as const,
      estimates: [
        { forwarder: "Atlas Test Cargo", mode: "air" as const, co2eKg: 89.3, payloadKg: 24, distanceKm: 6200, factorKgPerTonneKm: 0.6 },
        { forwarder: "Silk Sea", mode: "sea" as const, co2eKg: 2.4, payloadKg: 24, distanceKm: 6200, factorKgPerTonneKm: 0.016 },
      ],
      lowest: "Silk Sea", notes: ["فاصله از جدول تقریبی کریدور خوانده شد"], disclaimer: "برآورد مرتبهٔ بزرگی است",
    },
    schedule: [
      { code: "registered" as const, plannedAt: "2026-01-01T00:00:00Z", offsetDays: 0 },
      { code: "delivered" as const, plannedAt: "2099-01-06T00:00:00Z", offsetDays: 5 },
    ],
    scheduleBasis: "برنامهٔ داخلی است",
    hs: { chapter: "85", heading: "8507", description: "باتری‌ها", matchedOn: "battery", confidence: "low" as const },
    rfqMessage: "درخواست نرخ حمل — China به Iran",
  };

  it("loads analysis only on request and highlights the lowest emitter", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(insights), { headers: { "Content-Type": "application/json" } }));
    render(<InsightsPanel decision={decision(1)} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "محاسبهٔ تحلیل این تصمیم" }));
    expect(await screen.findByText("کم‌ترین انتشار")).toBeInTheDocument();
    expect(screen.getByText(/۸۹٫۳/)).toBeInTheDocument();
    expect(screen.getByText(/برآورد مرتبهٔ بزرگی است/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/insights/dec_1", undefined);
  });

  it("passes a user distance through to the API", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(insights), { headers: { "Content-Type": "application/json" } }));
    render(<InsightsPanel decision={decision(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "محاسبهٔ تحلیل این تصمیم" }));
    await screen.findByText("کم‌ترین انتشار");
    fireEvent.change(screen.getByLabelText(/فاصلهٔ مسیر/), { target: { value: "1000" } });
    await vi.waitFor(() => expect(fetch).toHaveBeenLastCalledWith("/api/insights/dec_1?distanceKm=1000", undefined));
  });

  it("shows the HS suggestion with its verification boundary and a copyable RFQ text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(insights), { headers: { "Content-Type": "application/json" } }));
    render(<InsightsPanel decision={decision(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "محاسبهٔ تحلیل این تصمیم" }));
    await screen.findByText(/8507/);
    expect(screen.getByText(/پیشنهاد اولیه است، نه طبقه‌بندی گمرکی/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "کپی متن درخواست نرخ" }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("درخواست نرخ حمل — China به Iran"));
    expect(await screen.findByText("کپی شد")).toBeInTheDocument();
  });

  it("computes demurrage from the entered dates and rate", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(insights), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ chargedDays: 7, freeDays: 7, ratePerContainerDay: 50, containers: 2, totalUsd: 700, notes: ["۷ روز فراتر از روزهای آزاد."], disclaimer: "روزهای تقویمی" }), { headers: { "Content-Type": "application/json" } }));
    render(<InsightsPanel decision={decision(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "محاسبهٔ تحلیل این تصمیم" }));
    fireEvent.change(screen.getByLabelText("تاریخ تخلیه"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("تاریخ خروج از بندر"), { target: { value: "2026-11-15" } });
    fireEvent.change(screen.getByLabelText("نرخ روزانه هر کانتینر (دلار)"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("تعداد کانتینر"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "محاسبهٔ دموراژ" }));
    expect(await screen.findByText("700")).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith("/api/insights/demurrage", expect.objectContaining({
      body: JSON.stringify({ arrivalDate: "2026-11-01T00:00:00.000Z", gateOutDate: "2026-11-15T00:00:00.000Z", freeDays: 7, dailyRateUsd: 50, containers: 2 }),
    }));
  });
});
