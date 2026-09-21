import { Router } from "express";
import type { ShipmentOption, ShipmentRequest } from "../types.js";

export const shipmentsRouter = Router();

/**
 * POST /api/shipments/recommend
 * ورودی: مشخصات محموله (مبدأ، مقصد، نوع کالا، وزن/حجم، اولویت زمان/هزینه)
 * خروجی: گزینه‌های حمل رتبه‌بندی‌شده بر اساس هزینه، زمان تحویل تخمینی و ریسک تأخیر.
 *
 * TODO: اتصال به موتور تصمیم (مدل پیش‌بینی تأخیر/هزینه بر اساس داده‌ی تاریخی).
 * فعلاً یک پاسخ نمونه برمی‌گرداند تا فرانت‌اند بتواند توسعه پیدا کند.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNonNegativeNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isShipmentRequest(value: unknown): value is ShipmentRequest {
  if (typeof value !== "object" || value === null) return false;

  const request = value as Record<string, unknown>;
  return (
    isNonEmptyString(request.origin) &&
    isNonEmptyString(request.destination) &&
    isNonEmptyString(request.cargoType) &&
    isOptionalNonNegativeNumber(request.weightKg) &&
    isOptionalNonNegativeNumber(request.volumeCbm) &&
    (request.priority === "cost" || request.priority === "time" || request.priority === "balanced")
  );
}

shipmentsRouter.post("/recommend", (req, res) => {
  if (!isShipmentRequest(req.body)) {
    res.status(400).json({ error: "مشخصات محموله نامعتبر است." });
    return;
  }

  const request = req.body;
  const mockOptions: ShipmentOption[] = [
    {
      forwarder: "نمونه فورواردر A",
      mode: "sea",
      estimatedCostUsd: 4200,
      estimatedDeliveryDays: 28,
      delayRiskScore: 0.18,
      recommended: true,
    },
    {
      forwarder: "نمونه فورواردر B",
      mode: "air",
      estimatedCostUsd: 9800,
      estimatedDeliveryDays: 6,
      delayRiskScore: 0.07,
      recommended: false,
    },
  ];

  res.json({ request, options: mockOptions });
});
