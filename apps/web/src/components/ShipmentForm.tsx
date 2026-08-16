import { useState } from "react";
import type { ShipmentRequest } from "../types";

interface Props {
  loading: boolean;
  onSubmit: (request: ShipmentRequest) => void;
}

const initialForm: ShipmentRequest = {
  origin: "",
  destination: "",
  cargoType: "",
  weightKg: undefined,
  volumeCbm: undefined,
  priority: "balanced",
};

export default function ShipmentForm({ loading, onSubmit }: Props) {
  const [form, setForm] = useState<ShipmentRequest>(initialForm);

  function update<K extends keyof ShipmentRequest>(key: K, value: ShipmentRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="shipment-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>مبدأ</span>
          <input
            required
            value={form.origin}
            onChange={(e) => update("origin", e.target.value)}
            placeholder="مثلاً شانگهای"
          />
        </label>

        <label className="field">
          <span>مقصد</span>
          <input
            required
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            placeholder="مثلاً بندرعباس"
          />
        </label>

        <label className="field">
          <span>نوع کالا</span>
          <input
            required
            value={form.cargoType}
            onChange={(e) => update("cargoType", e.target.value)}
            placeholder="مثلاً لوازم الکترونیکی"
          />
        </label>

        <label className="field">
          <span>وزن (کیلوگرم)</span>
          <input
            type="number"
            min={0}
            value={form.weightKg ?? ""}
            onChange={(e) =>
              update("weightKg", e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="اختیاری"
          />
        </label>

        <label className="field">
          <span>حجم (متر مکعب)</span>
          <input
            type="number"
            min={0}
            value={form.volumeCbm ?? ""}
            onChange={(e) =>
              update("volumeCbm", e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="اختیاری"
          />
        </label>

        <label className="field">
          <span>اولویت</span>
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value as ShipmentRequest["priority"])}
          >
            <option value="balanced">متعادل</option>
            <option value="cost">هزینه</option>
            <option value="time">زمان</option>
          </select>
        </label>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "در حال پردازش..." : "دریافت پیشنهاد بهترین گزینه"}
      </button>
    </form>
  );
}
