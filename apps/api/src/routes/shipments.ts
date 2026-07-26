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
shipmentsRouter.post("/recommend", (req, res) => {
  const request = req.body as ShipmentRequest;

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
