import type {
  DecisionInsights, DemurrageRequest, DemurrageResult, EmissionEstimate, EmissionsResult,
  HsSuggestion, MilestoneCode, PlannedMilestone, Recommendation,
} from "./types.js";

// Rough well-to-wheel intensities, tonnes CO2e per tonne-kilometre. These are
// order-of-magnitude planning values, not a GLEC/EN 16258 compliant inventory.
const factors: Record<"air" | "sea" | "land", number> = { air: 0.6, sea: 0.016, land: 0.09 };

// Coarse corridor distances in kilometres. Only used when the caller does not
// supply a distance; a lane outside this table returns null instead of a guess.
const corridors: { origin: string; destination: string; km: number }[] = [
  { origin: "china", destination: "iran", km: 6200 },
  { origin: "uae", destination: "iran", km: 1200 },
  { origin: "turkey", destination: "iran", km: 1900 },
  { origin: "germany", destination: "iran", km: 4600 },
  { origin: "india", destination: "iran", km: 2300 },
];

export const emissionsDisclaimer =
  "برآورد مرتبهٔ بزرگی بر پایهٔ ضریب تقریبی هر شیوه و فاصله است؛ محاسبهٔ رسمی GLEC/EN 16258 یا گزارش پایداری نیست.";

function corridorKm(origin: string, destination: string) {
  const o = origin.trim().toLowerCase();
  const d = destination.trim().toLowerCase();
  const forward = corridors.find((lane) => lane.origin === o && lane.destination === d);
  if (forward) return forward.km;
  const reverse = corridors.find((lane) => lane.origin === d && lane.destination === o);
  return reverse?.km ?? null;
}

export function estimateEmissions(decision: Recommendation, userDistanceKm?: number): EmissionsResult {
  const distanceSource = userDistanceKm !== undefined ? "user" : corridorKm(decision.request.origin, decision.request.destination) !== null ? "corridor-table" : "unavailable";
  const distanceKm = userDistanceKm ?? corridorKm(decision.request.origin, decision.request.destination);
  const notes: string[] = [];
  if (distanceSource === "corridor-table") notes.push("فاصله از جدول تقریبی کریدور خوانده شد؛ مسیر واقعی می‌تواند تفاوت داشته باشد.");
  if (distanceSource === "unavailable") notes.push("برای این مسیر فاصله در جدول نیست؛ فاصله را خودتان وارد کنید.");
  if (decision.options.some((option) => option.mode === "sea")) notes.push("برای حمل دریایی، ضریب کانتینری و نه LCL استفاده شده است.");

  const payloadKg = Math.max(decision.measures.actualWeightKg, decision.measures.air.volumetricKg);
  const estimates: EmissionEstimate[] = decision.options.map((option) => {
    const factor = factors[option.mode];
    const co2eKg = distanceKm === null || payloadKg === 0 ? 0 : (payloadKg / 1000) * distanceKm * factor;
    return { forwarder: option.forwarder, mode: option.mode, co2eKg: Math.round(co2eKg * 10) / 10, payloadKg, distanceKm, factorKgPerTonneKm: factor };
  });
  const comparable = estimates.filter((estimate) => estimate.co2eKg > 0);
  return {
    decisionId: decision.decisionId,
    distanceKm,
    distanceSource,
    estimates,
    lowest: comparable.length ? comparable.reduce((a, b) => (a.co2eKg <= b.co2eKg ? a : b)).forwarder : null,
    notes,
    disclaimer: emissionsDisclaimer,
  };
}

export function plannedSchedule(decision: Recommendation): PlannedMilestone[] {
  const transit = decision.options[0]?.estimatedDeliveryDays ?? 0;
  const created = Date.parse(decision.createdAt);
  const day = 86_400_000;
  const offsets: [MilestoneCode, number][] = transit >= 12
    ? [["registered", 0], ["picked-up", 2], ["in-transit", 4], ["customs", Math.round(transit * 0.8)], ["delivered", transit]]
    : [["registered", 0], ["picked-up", 1], ["in-transit", 2], ["customs", Math.round(transit * 0.7)], ["delivered", transit]];
  return offsets.map(([code, offsetDays]) => ({ code, offsetDays, plannedAt: new Date(created + offsetDays * day).toISOString() }));
}

export const scheduleBasis = "تاریخ‌ها از زمان تحویل تخمینی گزینهٔ اول پخش شده‌اند؛ برنامهٔ داخلی برای پیگیری هستند، نه تعهد شرکت حمل.";

const hsTable: { pattern: RegExp; chapter: string; heading: string; description: string; label: string }[] = [
  { pattern: /electronics|phone|laptop|computer|الکترونیک|گوشی|لپ‌?تاپ/i, chapter: "85", heading: "8543 / 8471", description: "ماشین‌آلات و تجهیزات برقی و قطعات آن", label: "electronics" },
  { pattern: /battery|lithium|باتری|لیتیوم/i, chapter: "85", heading: "8507", description: "باتری‌ها و سلول‌های الکتریکی (کالای خطرناک برای حمل)", label: "battery" },
  { pattern: /textile|clothing|garment|پارچه|پوشاک/i, chapter: "61-62", heading: "6109 / 6203", description: "پوشاک بافتنی و ندوخت", label: "textile" },
  { pattern: /food|fruit|غذا|میوه|خشکبار/i, chapter: "08 / 20", heading: "0813 / 2008", description: "میوه، خشکبار و فرآورده‌های غذایی", label: "food" },
  { pattern: /pharma|medicine|medical|دارو|پزشکی/i, chapter: "30", heading: "3004", description: "داروها و فرآورده‌های دارویی", label: "pharma" },
  { pattern: /parts|machinery|spare|قطعه|ماشین/i, chapter: "84", heading: "8487", description: "ماشین‌آلات و قطعات مکانیکی", label: "parts" },
  { pattern: /chemical|شیمیایی/i, chapter: "28-38", heading: "3824", description: "فرآورده‌های شیمیایی متنوع", label: "chemical" },
];

export function suggestHsChapter(cargoType: string): HsSuggestion | null {
  const found = hsTable.find((row) => row.pattern.test(cargoType));
  if (!found) return null;
  return { chapter: found.chapter, heading: found.heading, description: found.description, matchedOn: found.label, confidence: "low" };
}

export function buildRfqMessage(decision: Recommendation) {
  const { request, measures } = decision;
  return [
    `درخواست نرخ حمل — ${request.origin} به ${request.destination}`,
    `نوع کالا: ${request.cargoType}`,
    `وزن: ${measures.actualWeightKg.toLocaleString("en-US")} kg · حجم: ${measures.volumeCbm.toFixed(3)} CBM`,
    `تعداد بسته: ${request.pieces ?? 1}` + (request.dimensionsCm ? ` · ابعاد هر بسته: ${request.dimensionsCm.length}×${request.dimensionsCm.width}×${request.dimensionsCm.height} cm` : ""),
    `اینکوترمز: ${request.incoterm ?? "مشخص نشده"}`,
    `اولویت: ${request.priority === "cost" ? "کمترین هزینه" : request.priority === "time" ? "سریع‌ترین" : "متعادل"}`,
    `شناسهٔ مرجع: ${decision.decisionId}`,
    "لطفاً نرخ، زمان تحویل و مدت اعتبار پیشنهاد را اعلام کنید.",
  ].join("\n");
}

export const demurrageDisclaimer =
  "محاسبه بر اساس روزهای تقویمی و نرخ ثابت ورودی است؛ تعطیلات، روز شروع شمارش و پله‌های تعرفهٔ حامل را لحاظ نمی‌کند.";

export function isDemurrageRequest(value: unknown): value is DemurrageRequest {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  const validDate = (input: unknown) => typeof input === "string" && Number.isFinite(Date.parse(input));
  return validDate(body.arrivalDate) && validDate(body.gateOutDate)
    && typeof body.freeDays === "number" && Number.isInteger(body.freeDays) && body.freeDays >= 0 && body.freeDays <= 365
    && typeof body.dailyRateUsd === "number" && Number.isFinite(body.dailyRateUsd) && body.dailyRateUsd >= 0 && body.dailyRateUsd <= 1e7
    && (body.containers === undefined || (typeof body.containers === "number" && Number.isInteger(body.containers) && body.containers >= 1 && body.containers <= 100));
}

export function estimateDemurrage(input: DemurrageRequest): DemurrageResult {
  const day = 86_400_000;
  const heldDays = Math.max(0, Math.round((Date.parse(input.gateOutDate) - Date.parse(input.arrivalDate)) / day));
  const chargedDays = Math.max(0, heldDays - input.freeDays);
  const containers = input.containers ?? 1;
  return {
    chargedDays,
    freeDays: input.freeDays,
    ratePerContainerDay: input.dailyRateUsd,
    containers,
    totalUsd: Math.round(chargedDays * containers * input.dailyRateUsd * 100) / 100,
    notes: [
      `مدت نگه‌داری در بندر ${heldDays.toLocaleString("fa-IR")} روز تقویمی محاسبه شد.`,
      chargedDays === 0 ? "هنوز از روزهای آزاد عبور نکرده‌اید." : `${chargedDays.toLocaleString("fa-IR")} روز فراتر از روزهای آزاد.`,
    ],
    disclaimer: demurrageDisclaimer,
  };
}

export function buildInsights(decision: Recommendation, userDistanceKm?: number): DecisionInsights {
  return {
    decisionId: decision.decisionId,
    emissions: estimateEmissions(decision, userDistanceKm),
    schedule: plannedSchedule(decision),
    scheduleBasis,
    hs: suggestHsChapter(decision.request.cargoType),
    rfqMessage: buildRfqMessage(decision),
  };
}
