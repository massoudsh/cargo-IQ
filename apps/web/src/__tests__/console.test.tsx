import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "../components/AppShell";
import GlassSurface from "../components/GlassSurface";
import DecisionWorkspace from "../components/DecisionWorkspace";
import ShipmentForm from "../components/ShipmentForm";
import { csvCell, decisionCsv, filterDecisions, type DecisionFilters } from "../decisionReport";
import { ApiError, requestJson } from "../api";
import type { RecommendResponse } from "../types";

const filters: DecisionFilters = { query: "", from: "", to: "", status: "all", order: "newest" };
function decision(index: number): RecommendResponse {
  return {
    decisionId: `dec_${index}`, modelVersion: "rules-v2", confidence: 0.5,
    request: { origin: index % 2 ? "China" : "Turkey", destination: "Iran", cargoType: "parts", priority: "balanced" },
    constraintsApplied: [], createdAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
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
