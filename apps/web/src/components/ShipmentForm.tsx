import { useState } from "react";
import type { ShipmentRequest } from "../types";

interface Props {
  loading: boolean;
  onSubmit: (request: ShipmentRequest) => void;
}

const initialForm: ShipmentRequest = { origin: "", destination: "", cargoType: "", priority: "balanced" };

export default function ShipmentForm({ loading, onSubmit }: Props) {
  const [form, setForm] = useState<ShipmentRequest>(initialForm);

  function update<K extends keyof ShipmentRequest>(key: K, value: ShipmentRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({ ...form, origin: form.origin.trim(), destination: form.destination.trim(), cargoType: form.cargoType.trim() });
  }

  return (
    <form className="shipment-form" onSubmit={handleSubmit} aria-busy={loading}>
      <h2>مقایسهٔ گزینه‌های حمل</h2>
      <p className="hint">اطلاعات نمونه‌اند؛ قیمت نهایی و مسیر قابل‌اجرا باید با فورواردر تأیید شود.</p>
      <fieldset disabled={loading}>
        <legend className="sr-only">مشخصات محموله</legend>
        <div className="form-grid">
          <label className="field"><span>مبدأ</span><input required maxLength={300} value={form.origin} onChange={(e) => update("origin", e.target.value)} placeholder="مثلاً China" /></label>
          <label className="field"><span>مقصد</span><input required maxLength={300} value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="مثلاً Iran" /></label>
          <label className="field"><span>نوع کالا</span><input required maxLength={300} value={form.cargoType} onChange={(e) => update("cargoType", e.target.value)} placeholder="مثلاً electronics" /></label>
          <label className="field"><span>اولویت</span><select value={form.priority} onChange={(e) => update("priority", e.target.value as ShipmentRequest["priority"])}><option value="balanced">متعادل</option><option value="cost">هزینه</option><option value="time">زمان</option></select></label>
          <label className="field"><span>وزن کل (کیلوگرم)</span><input type="number" step="any" min={0} max={1e9} value={form.weightKg ?? ""} onChange={(e) => update("weightKg", e.target.value ? Number(e.target.value) : undefined)} placeholder="اختیاری" /></label>
          <label className="field"><span>حجم کل (متر مکعب)</span><input type="number" step="any" min={0} max={1e9} value={form.volumeCbm ?? ""} onChange={(e) => update("volumeCbm", e.target.value ? Number(e.target.value) : undefined)} placeholder="اختیاری" /></label>
        </div>
        <details className="packaging" onInvalid={(event) => { event.currentTarget.open = true; }}>
          <summary>ابعاد بسته و اینکوترمز (اختیاری)</summary>
          <p className="hint" id="weight-help">برای بسته‌های هم‌اندازه: وزن حجمی هوایی = طول × عرض × ارتفاع × تعداد ÷ ۶۰۰۰. در صورت ورود ابعاد، حجم کل در این محاسبه استفاده نمی‌شود. ضریب نهایی با شرکت حمل است؛ قیمت نمونه با وزن تغییر نمی‌کند.</p>
          <div className="form-grid">
            <label className="field"><span>تعداد بسته</span><input type="number" min={1} max={10000} step={1} value={form.pieces ?? ""} onChange={(e) => update("pieces", e.target.value ? Number(e.target.value) : undefined)} placeholder="پیش‌فرض ۱" /></label>
            {(["length", "width", "height"] as const).map((dimension) => (
              <label className="field" key={dimension}>
                <span>{dimension === "length" ? "طول" : dimension === "width" ? "عرض" : "ارتفاع"} هر بسته (سانتی‌متر)</span>
                <input type="number" step="any" min={0.01} max={10000} required={form.dimensionsCm !== undefined} aria-describedby="weight-help" value={form.dimensionsCm?.[dimension] || ""} onChange={(e) => {
                  const dimensions = { ...(form.dimensionsCm ?? { length: 0, width: 0, height: 0 }), [dimension]: Number(e.target.value) };
                  update("dimensionsCm", Object.values(dimensions).every((value) => value === 0) ? undefined : dimensions);
                }} />
              </label>
            ))}
            <label className="field"><span>اینکوترمز</span><select value={form.incoterm ?? ""} onChange={(e) => update("incoterm", e.target.value ? e.target.value as ShipmentRequest["incoterm"] : undefined)}><option value="">انتخاب نشده</option>{(["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
        </details>
        <button type="submit" className="submit-btn">{loading ? "در حال پردازش..." : "دریافت پیشنهاد بهترین گزینه"}</button>
      </fieldset>
    </form>
  );
}
