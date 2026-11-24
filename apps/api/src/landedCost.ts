import type { LandedCostLine, LandedCostRequest, LandedCostResult, Recommendation, ShipmentRequest } from "./types.js";

type Incoterm = NonNullable<ShipmentRequest["incoterm"]>;

// Which cost components the seller's price already contains. This mirrors the
// Incoterms 2020 delivery points at a planning level only: it does not model
// export clearance, terminal handling or risk transfer in detail.
const includedInGoods: Record<Incoterm, { freight: boolean; insurance: boolean }> = {
  EXW: { freight: false, insurance: false },
  FOB: { freight: false, insurance: false },
  CFR: { freight: true, insurance: false },
  CIF: { freight: true, insurance: true },
  DAP: { freight: true, insurance: true },
  DDP: { freight: true, insurance: true },
};

export const landedCostDisclaimer =
  "این برآورد برنامه‌ریزی است: نرخ حقوق ورودی، مالیات و بیمه را شما وارد می‌کنید و جایگزین اظهارنامه، نظر کارگزار یا نرخ رسمی گمرک نیست.";

export function isLandedCostRequest(value: unknown): value is Omit<LandedCostRequest, "decisionId"> {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  const money = (input: unknown) => typeof input === "number" && Number.isFinite(input) && input >= 0 && input <= 1e12;
  const rate = (input: unknown) => input === undefined || (typeof input === "number" && Number.isFinite(input) && input >= 0 && input <= 100);
  return money(body.declaredValueUsd) && (body.freightUsd === undefined || money(body.freightUsd)) && rate(body.dutyRatePct) && rate(body.vatRatePct) && rate(body.insuranceRatePct) && (body.fxRateIrrPerUsd === undefined || (typeof body.fxRateIrrPerUsd === "number" && Number.isFinite(body.fxRateIrrPerUsd) && body.fxRateIrrPerUsd > 0 && body.fxRateIrrPerUsd <= 1e9));
}

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateLandedCost(decision: Recommendation, input: Omit<LandedCostRequest, "decisionId">): LandedCostResult {
  const incoterm = decision.request.incoterm ?? null;
  const included = incoterm ? includedInGoods[incoterm] : includedInGoods.FOB;
  const assumptions: string[] = [];
  if (!incoterm) assumptions.push("اینکوترمز انتخاب نشده است؛ فرض پایهٔ FOB استفاده شد تا کرایه و بیمه به ارزش گمرکی اضافه شوند.");

  const placedFreight = decision.options[0]?.estimatedCostUsd;
  let freightUsd = input.freightUsd;
  if (freightUsd === undefined) {
    freightUsd = placedFreight ?? 0;
    assumptions.push(placedFreight === undefined ? "کرایهٔ بین‌المللی وارد نشده و صفر فرض شد." : "کرایهٔ بین‌المللی از هزینهٔ نمونهٔ گزینهٔ پیشنهادی پر شد؛ قابل ویرایش است.");
  }
  if (!included.freight) assumptions.push("این اینکوترمز کرایه را در قیمت کالا ندارد، پس کرایه به ارزش گمرکی و هزینهٔ نهایی اضافه شد.");

  const goodsValueUsd = input.declaredValueUsd;
  const insuranceRatePct = input.insuranceRatePct ?? 0.5;
  const insuranceUsd = included.insurance ? 0 : ((goodsValueUsd + (included.freight ? 0 : freightUsd)) * insuranceRatePct) / 100;
  if (!included.insurance) assumptions.push(`بیمه با نرخ ورودی ${insuranceRatePct}% محاسبه شد؛ نرخ واقعی به قرارداد بیمه بستگی دارد.`);

  const customsValueUsd = goodsValueUsd + (included.freight ? 0 : freightUsd) + (included.insurance ? 0 : insuranceUsd);
  if (incoterm === "CIF" || incoterm === "CFR" || incoterm === "DAP" || incoterm === "DDP") {
    assumptions.push("فرض شد کرایهٔ بین‌المللی در قیمت کالا لحاظ شده است؛ اگر فاکتور آن را جدا نشان می‌دهد، ارزش گمرکی را دوباره بررسی کنید.");
  }

  const dutyRatePct = input.dutyRatePct ?? 0;
  const vatRatePct = input.vatRatePct ?? 0;
  if (dutyRatePct === 0 || vatRatePct === 0) assumptions.push("نرخ حقوق ورودی یا مالیات صفر وارد شده است؛ این مقدار را با اظهارنامهٔ واقعی جایگزین کنید.");
  const dutyUsd = (customsValueUsd * dutyRatePct) / 100;
  const vatUsd = ((customsValueUsd + dutyUsd) * vatRatePct) / 100;

  const lines: LandedCostLine[] = [
    { code: "goods", label: "ارزش کالا", amountUsd: round(goodsValueUsd), counted: true, note: incoterm ? `بر پایهٔ ${incoterm}` : "بر پایهٔ FOB" },
    { code: "freight", label: "کرایهٔ بین‌المللی", amountUsd: round(freightUsd), counted: !included.freight, note: included.freight ? "در قیمت کالا لحاظ شده؛ دوباره جمع نمی‌شود" : "به ارزش گمرکی اضافه شد" },
    { code: "insurance", label: "بیمه", amountUsd: round(insuranceUsd), counted: !included.insurance, note: included.insurance ? "در قیمت کالا لحاظ شده" : "برآورد با نرخ ورودی" },
    { code: "duty", label: "حقوق ورودی", amountUsd: round(dutyUsd), counted: true, note: `${dutyRatePct}% از ارزش گمرکی` },
    { code: "vat", label: "مالیات بر ارزش افزوده", amountUsd: round(vatUsd), counted: true, note: `${vatRatePct}% از ارزش گمرکی به‌علاوهٔ حقوق ورودی` },
  ];
  const totalUsd = round(lines.reduce((sum, line) => sum + (line.counted ? line.amountUsd : 0), 0));

  return {
    decisionId: decision.decisionId,
    incoterm,
    customsValueUsd: round(customsValueUsd),
    lines,
    totalUsd,
    totalIrr: input.fxRateIrrPerUsd ? Math.round(totalUsd * input.fxRateIrrPerUsd) : undefined,
    assumptions,
    disclaimer: landedCostDisclaimer,
  };
}
