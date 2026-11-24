import { useState } from "react";
import { requestJson } from "../api";
import type { LandedCostResult, RecommendResponse } from "../types";

const fields = [
  ["declaredValueUsd", "ارزش کالا در فاکتور (دلار)", ""],
  ["freightUsd", "کرایهٔ بین‌المللی (دلار)", "خالی = هزینهٔ نمونهٔ گزینهٔ پیشنهادی"],
  ["insuranceRatePct", "نرخ بیمه (٪)", "پیش‌فرض ۰٫۵"],
  ["dutyRatePct", "حقوق ورودی (٪)", "از اظهارنامه"],
  ["vatRatePct", "مالیات بر ارزش افزوده (٪)", "از اظهارنامه"],
] as const;

export default function LandedCostPanel({ decision, fxRate, onFxRate }: { decision: RecommendResponse; fxRate?: number; onFxRate: (rate?: number) => void }) {
  const [values, setValues] = useState<Record<string, string>>({ declaredValueUsd: "", freightUsd: "", insuranceRatePct: "0.5", dutyRatePct: "", vatRatePct: "" });
  const [result, setResult] = useState<LandedCostResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function estimate() {
    setPending(true); setError(null); setResult(null);
    try {
      const payload: Record<string, number> = { declaredValueUsd: Number(values.declaredValueUsd) };
      for (const key of ["freightUsd", "insuranceRatePct", "dutyRatePct", "vatRatePct"] as const) {
        if (values[key] !== "") payload[key] = Number(values[key]);
      }
      if (fxRate) payload.fxRateIrrPerUsd = fxRate;
      setResult(await requestJson<LandedCostResult>("/api/landed-cost/estimate", { decisionId: decision.decisionId, ...payload }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "محاسبهٔ هزینهٔ نهایی ناموفق بود.");
    } finally { setPending(false); }
  }

  return <div className="tool-card">
    <h3>هزینهٔ نهایی ترخیص (Landing Cost)</h3>
    <p className="hint">ارزش کالا، کرایه، بیمه، حقوق ورودی و مالیات را با نرخی که خودتان وارد می‌کنید جمع می‌کند؛ اینکوترمز تصمیم تعیین می‌کند کرایه در ارزش گمرکی حساب شود یا نه.</p>
    <div className="form-grid">
      {fields.map(([key, label, hint]) => <label className="field" key={key}><span>{label}</span><input type="number" min={0} step="any" inputMode="decimal" value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} placeholder={hint} /></label>)}
      <label className="field"><span>نرخ ارز (ریال برای هر دلار)</span><input type="number" min={0} step="any" inputMode="decimal" value={fxRate ?? ""} onChange={(event) => { onFxRate(event.target.value ? Number(event.target.value) : undefined); setResult(null); }} placeholder="اختیاری؛ برای نمایش ریالی" /></label>
    </div>
    <button type="button" className="secondary-btn" disabled={pending || !values.declaredValueUsd} onClick={() => void estimate()}>{pending ? "در حال محاسبه…" : "محاسبهٔ هزینهٔ نهایی"}</button>
    {error && <p role="alert" className="error">{error}</p>}
    {result && <div aria-live="polite">
      <table className="mini-table">
        <caption>اینکوترمز: {result.incoterm ?? "انتخاب نشده (FOB فرض شد)"} · ارزش گمرکی: <bdi>{result.customsValueUsd.toLocaleString("en-US")}</bdi> دلار</caption>
        <thead><tr><th scope="col">جزء</th><th scope="col">مبلغ (دلار)</th><th scope="col">توضیح</th></tr></thead>
        <tbody>{result.lines.map((line) => <tr key={line.code} className={line.counted ? "" : "excluded"}><th scope="row">{line.label}</th><td className="numeric"><bdi>{line.amountUsd.toLocaleString("en-US")}</bdi></td><td>{line.note}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">جمع هزینهٔ نهایی</th><td className="numeric"><bdi>{result.totalUsd.toLocaleString("en-US")}</bdi> دلار</td><td>{result.totalIrr ? <><bdi>{result.totalIrr.toLocaleString("fa-IR")}</bdi> ریال با نرخ واردشده</> : "برای نمایش ریالی نرخ ارز را وارد کنید"}</td></tr></tfoot>
      </table>
      <ul className="hint assumptions">{result.assumptions.map((line) => <li key={line}>{line}</li>)}</ul>
      <p className="hint">{result.disclaimer}</p>
    </div>}
  </div>;
}
