import { Router } from "express";
import type { DecisionStore } from "../decisionStore.js";
import type { ComplianceCheck, ReadinessCheck, ReadinessResult, ShipmentRequest } from "../types.js";

export function buildChecks(request: Pick<ShipmentRequest, "cargoType" | "origin" | "destination">): ComplianceCheck[] {
  const { cargoType, origin, destination } = request;
  const checks: ComplianceCheck[] = [
    { code: "commercial-invoice", title: "فاکتور تجاری", status: "required", guidance: "فاکتور تجاری و ارزش کالا را برای بررسی آماده کنید." },
    { code: "packing-list", title: "فهرست بسته‌بندی", status: "required", guidance: "تعداد، وزن و شرح اقلام را آماده کنید." },
    { code: "origin-certificate", title: "گواهی مبدأ", status: "recommended", guidance: `الزامات گواهی مبدأ در مسیر ${origin} به ${destination} با کارگزار بررسی شود.` },
    { code: "dangerous-goods", title: "کالای خطرناک", status: "review", guidance: "تشخیص خطرناک‌بودن کالا فقط با نام آن ممکن نیست؛ مشخصات فنی و SDS را بررسی کنید." },
    { code: "health-permit", title: "مجوزهای تخصصی", status: "review", guidance: "کد HS و کشور مقصد برای تعیین مجوزهای لازم توسط کارگزار بررسی شود." },
  ];
  if (/battery|lithium|باتری|لیتیوم|شیمیایی|chemical/i.test(cargoType)) {
    checks[3] = { code: "dangerous-goods", title: "کالای خطرناک", status: "required", guidance: "بررسی SDS/MSDS، طبقه‌بندی خطر و پذیرش شرکت حمل پیش از رزرو لازم است." };
  }
  if (/food|دارو|medical|pharma|غذا|پزشکی/i.test(cargoType)) {
    checks[4] = { code: "health-permit", title: "مجوزهای تخصصی", status: "required", guidance: "مجوزهای مرتبط با غذا، دارو یا تجهیزات پزشکی را با کارگزار بررسی کنید." };
  }
  return checks;
}

export const complianceDisclaimer = "این چک‌لیست عمومی و مبتنی بر نام کالا است؛ تأیید قانونی یا ترخیص نیست و جایگزین نظر کارگزار گمرکی نیست.";
export const readinessDisclaimer = "وضعیت «آماده» یعنی تیم شما علامت زده است که مدرک را دارد؛ سامانه فایلی بارگذاری یا اصالت مدرک را بررسی نمی‌کند.";

export function createComplianceRouter(store: DecisionStore) {
  const router = Router();
  // tenant:decisionId -> document code -> prepared timestamp
  const readiness = new Map<string, Map<string, string>>();

  router.post("/check", (req, res) => {
    const { cargoType, origin, destination } = req.body ?? {};
    if (![cargoType, origin, destination].every((value) => typeof value === "string" && value.trim() && value.length <= 300)) {
      res.status(400).json({ error: { code: "INVALID_COMPLIANCE_REQUEST", message: "نوع کالا، مبدأ و مقصد الزامی است (حداکثر ۳۰۰ نویسه)." } });
      return;
    }
    res.json({ checks: buildChecks({ cargoType, origin: origin.trim(), destination: destination.trim() }), disclaimer: complianceDisclaimer });
  });

  router.get("/readiness/:decisionId", (req, res) => {
    const decision = store.getRecommendation(req.tenantId, req.params.decisionId);
    if (!decision) {
      res.status(404).json({ error: { code: "DECISION_NOT_FOUND", message: "تصمیم پیدا نشد." } });
      return;
    }
    res.json(readinessFor(req.tenantId, decision.decisionId, decision.request));
  });

  router.post("/readiness/:decisionId", (req, res) => {
    const decision = store.getRecommendation(req.tenantId, req.params.decisionId);
    if (!decision) {
      res.status(404).json({ error: { code: "DECISION_NOT_FOUND", message: "تصمیم پیدا نشد." } });
      return;
    }
    const { code, prepared } = req.body ?? {};
    const checks = buildChecks(decision.request);
    if (typeof code !== "string" || !checks.some((check) => check.code === code) || typeof prepared !== "boolean") {
      res.status(400).json({ error: { code: "INVALID_READINESS", message: "کد مدرک یا وضعیت آماده‌بودن معتبر نیست." } });
      return;
    }
    const key = `${req.tenantId}:${decision.decisionId}`;
    const entry = readiness.get(key) ?? new Map<string, string>();
    if (prepared) entry.set(code, new Date().toISOString());
    else entry.delete(code);
    readiness.set(key, entry);
    res.json(readinessFor(req.tenantId, decision.decisionId, decision.request));
  });

  function readinessFor(tenantId: string, decisionId: string, request: ShipmentRequest): ReadinessResult {
    const entry = readiness.get(`${tenantId}:${decisionId}`);
    const checks: ReadinessCheck[] = buildChecks(request).map((check) => ({ ...check, prepared: entry?.has(check.code) ?? false, preparedAt: entry?.get(check.code) }));
    return {
      decisionId,
      checks,
      outstandingRequired: checks.filter((check) => check.status === "required" && !check.prepared).length,
      disclaimer: readinessDisclaimer,
    };
  }

  return router;
}
