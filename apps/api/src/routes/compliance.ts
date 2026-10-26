import { Router } from "express";
import type { ComplianceCheck } from "../types.js";

export const complianceRouter = Router();

complianceRouter.post("/check", (req, res) => {
  const { cargoType, origin, destination } = req.body ?? {};
  if (![cargoType, origin, destination].every((value) => typeof value === "string" && value.trim() && value.length <= 300)) {
    res.status(400).json({ error: { code: "INVALID_COMPLIANCE_REQUEST", message: "نوع کالا، مبدأ و مقصد الزامی است (حداکثر ۳۰۰ نویسه)." } });
    return;
  }

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
  res.json({ checks, disclaimer: "این چک‌لیست عمومی و مبتنی بر نام کالا است؛ تأیید قانونی یا ترخیص نیست و جایگزین نظر کارگزار گمرکی نیست." });
});
