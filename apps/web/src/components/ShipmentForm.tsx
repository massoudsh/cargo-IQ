import { useRef, useState, type ReactNode } from "react";
import type { ShipmentRequest } from "../types";

interface Props { loading: boolean; onSubmit: (request: ShipmentRequest) => void; }
const initialForm: ShipmentRequest = { origin: "", destination: "", cargoType: "", priority: "balanced" };
const labels: Record<string, string> = { origin: "مبدأ", destination: "مقصد", cargoType: "نوع کالا", weightKg: "وزن کل (کیلوگرم)", volumeCbm: "حجم کل (متر مکعب)", pieces: "تعداد بسته", length: "طول هر بسته (سانتی‌متر)", width: "عرض هر بسته (سانتی‌متر)", height: "ارتفاع هر بسته (سانتی‌متر)" };

function Field({ name, error, children }: { name: string; error?: string; children: ReactNode }) {
  return <div className="field"><label htmlFor={`shipment-${name}`}>{labels[name]}</label>{children}{error && <span className="field-error" id={`error-${name}`}>{error}</span>}</div>;
}

export default function ShipmentForm({ loading, onSubmit }: Props) {
  const [form, setForm] = useState<ShipmentRequest>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const summary = useRef<HTMLDivElement>(null);
  const packaging = useRef<HTMLDetailsElement>(null);

  function update<K extends keyof ShipmentRequest>(key: K, value: ShipmentRequest[K]) { setForm((prev) => ({ ...prev, [key]: value })); }
  function fieldProps(name: string) {
    return { id: `shipment-${name}`, name, "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `error-${name}` : undefined };
  }
  function focusField(name: string) {
    const field = document.getElementById(`shipment-${name}`);
    const details = field?.closest("details");
    if (details) details.open = true;
    field?.focus();
  }
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    for (const field of Array.from(event.currentTarget.elements)) {
      if (!(field instanceof HTMLInputElement)) continue;
      if (!field.validity.valid || (field.required && !field.value.trim())) {
        next[field.name] = field.validity.rangeOverflow || field.validity.rangeUnderflow || field.validity.stepMismatch
          ? "عدد را در بازه و گام مجاز وارد کنید." : "این فیلد را با مقدار معتبر تکمیل کنید.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length) { window.setTimeout(() => summary.current?.focus(), 0); return; }
    onSubmit({ ...form, origin: form.origin.trim(), destination: form.destination.trim(), cargoType: form.cargoType.trim() });
  }

  return <form className="shipment-form" noValidate onSubmit={handleSubmit} aria-busy={loading} onChange={(event) => {
    const field = event.target;
    if (field instanceof HTMLInputElement && field.name) setErrors((previous) => { const next = { ...previous }; delete next[field.name]; return next; });
  }}>
    <h2>مقایسهٔ گزینه‌های حمل</h2>
    <p className="hint">اطلاعات نمونه‌اند؛ قیمت نهایی و مسیر قابل‌اجرا باید با فورواردر تأیید شود.</p>
    {Object.keys(errors).length > 0 && <div ref={summary} tabIndex={-1} className="error" role="alert"><strong>لطفاً فیلدهای زیر را اصلاح کنید:</strong><ul>{Object.entries(errors).map(([name, message]) => <li key={name}><a href={`#shipment-${name}`} onClick={(event) => { event.preventDefault(); focusField(name); }}>{labels[name]}: {message}</a></li>)}</ul></div>}
    <fieldset disabled={loading}>
      <legend className="sr-only">مشخصات محموله</legend>
      <div className="form-grid">
        {(["origin", "destination", "cargoType"] as const).map((name) => <Field key={name} name={name} error={errors[name]}><input {...fieldProps(name)} required maxLength={300} value={form[name]} onChange={(event) => update(name, event.target.value)} placeholder={name === "origin" ? "مثلاً China" : name === "destination" ? "مثلاً Iran" : "مثلاً electronics"} /></Field>)}
        <label className="field"><span>اولویت</span><select value={form.priority} onChange={(event) => update("priority", event.target.value as ShipmentRequest["priority"])}><option value="balanced">متعادل</option><option value="cost">هزینه</option><option value="time">زمان</option></select></label>
        {(["weightKg", "volumeCbm"] as const).map((name) => <Field key={name} name={name} error={errors[name]}><input {...fieldProps(name)} type="number" step="any" min={0} max={1e9} value={form[name] ?? ""} onChange={(event) => update(name, event.target.value ? Number(event.target.value) : undefined)} placeholder="اختیاری" /></Field>)}
      </div>
      <details ref={packaging} className="packaging" onInvalid={(event) => { event.currentTarget.open = true; }}>
        <summary>ابعاد بسته و اینکوترمز (اختیاری)</summary>
        <p className="hint" id="weight-help">برای بسته‌های هم‌اندازه: وزن حجمی هوایی = طول × عرض × ارتفاع × تعداد ÷ ۶۰۰۰. در صورت ورود ابعاد، حجم کل در این محاسبه استفاده نمی‌شود. ضریب نهایی با شرکت حمل است؛ قیمت نمونه با وزن تغییر نمی‌کند.</p>
        <div className="form-grid">
          <Field name="pieces" error={errors.pieces}><input {...fieldProps("pieces")} type="number" min={1} max={10000} step={1} value={form.pieces ?? ""} onChange={(event) => update("pieces", event.target.value ? Number(event.target.value) : undefined)} placeholder="پیش‌فرض ۱" /></Field>
          {(["length", "width", "height"] as const).map((dimension) => <Field key={dimension} name={dimension} error={errors[dimension]}>
            <input {...fieldProps(dimension)} type="number" step="any" min={0.01} max={10000} required={form.dimensionsCm !== undefined} aria-describedby={`weight-help${errors[dimension] ? ` error-${dimension}` : ""}`} value={form.dimensionsCm?.[dimension] || ""} onChange={(event) => {
              const dimensions = { ...(form.dimensionsCm ?? { length: 0, width: 0, height: 0 }), [dimension]: Number(event.target.value) };
              update("dimensionsCm", Object.values(dimensions).every((value) => value === 0) ? undefined : dimensions);
            }} />
          </Field>)}
          <label className="field"><span>اینکوترمز</span><select value={form.incoterm ?? ""} onChange={(event) => update("incoterm", event.target.value ? event.target.value as ShipmentRequest["incoterm"] : undefined)}><option value="">انتخاب نشده</option>{(["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
      </details>
      <button type="submit" className="submit-btn">{loading ? "در حال پردازش..." : "دریافت پیشنهاد بهترین گزینه"}</button>
    </fieldset>
  </form>;
}
