import { useEffect, useState } from "react";
import { requestJson } from "../api";
import type { OfferComparison, RfqRequest } from "../types";

export default function OffersPanel({ rfq }: { rfq: RfqRequest }) {
  const [comparison, setComparison] = useState<OfferComparison | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forwarders = rfq.forwarders ?? [];
  const [form, setForm] = useState({ forwarder: forwarders[0] ?? "", costUsd: "", transitDays: "", validUntil: "", note: "" });

  useEffect(() => {
    let cancelled = false;
    requestJson<OfferComparison>(`/api/quotes/${rfq.rfqId}/offers`)
      .then((data) => { if (!cancelled) setComparison(data); })
      .catch(() => { if (!cancelled) setComparison(null); });
    return () => { cancelled = true; };
  }, [rfq.rfqId]);

  async function record() {
    setPending(true); setError(null);
    try {
      await requestJson(`/api/quotes/${rfq.rfqId}/offers`, {
        forwarder: form.forwarder,
        costUsd: Number(form.costUsd),
        transitDays: Number(form.transitDays),
        validUntil: form.validUntil ? new Date(`${form.validUntil}T00:00:00Z`).toISOString() : undefined,
        note: form.note || undefined,
      });
      setComparison(await requestJson<OfferComparison>(`/api/quotes/${rfq.rfqId}/offers`));
      setForm({ ...form, costUsd: "", transitDays: "", validUntil: "", note: "" });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ثبت پیشنهاد ناموفق بود.");
    } finally { setPending(false); }
  }

  return <div className="tool-card">
    <h3>مقایسهٔ پیشنهادهای دریافتی</h3>
    <p className="hint">پیشنهادهای واقعی فورواردرها را دستی وارد کنید. سامانه هیچ نرخی نمی‌گیرد و صحت آن را تأیید نمی‌کند؛ پیشنهاد منقضی در انتخاب بهترین گزینه حساب نمی‌شود.</p>
    <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void record(); }}>
      <label className="field"><span>فورواردر</span><select value={form.forwarder} onChange={(event) => setForm({ ...form, forwarder: event.target.value })}>{forwarders.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label className="field"><span>هزینه (دلار)</span><input type="number" required min={0} step="any" value={form.costUsd} onChange={(event) => setForm({ ...form, costUsd: event.target.value })} /></label>
      <label className="field"><span>زمان تحویل (روز)</span><input type="number" required min={0} max={3650} step="1" value={form.transitDays} onChange={(event) => setForm({ ...form, transitDays: event.target.value })} /></label>
      <label className="field"><span>اعتبار تا (اختیاری)</span><input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} /></label>
      <label className="field"><span>یادداشت (اختیاری)</span><input maxLength={500} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
      <button type="submit" className="secondary-btn" disabled={pending || !form.forwarder || !form.costUsd || !form.transitDays}>{pending ? "در حال ثبت…" : "ثبت پیشنهاد"}</button>
    </form>
    {error && <p role="alert" className="error">{error}</p>}
    {comparison && (comparison.offers.length ? <div aria-live="polite">
      <table className="mini-table">
        <thead><tr><th scope="col">فورواردر</th><th scope="col">هزینه (دلار)</th><th scope="col">روز</th><th scope="col">اعتبار</th></tr></thead>
        <tbody>{comparison.offers.map((offer) => <tr key={offer.forwarder}>
          <th scope="row"><bdi>{offer.forwarder}</bdi>{offer.forwarder === comparison.bestValue && <span className="status-badge status-success">بهترین تعادل</span>}</th>
          <td className="numeric"><bdi>{offer.costUsd.toLocaleString("en-US")}</bdi>{offer.forwarder === comparison.cheapest && <small> ارزان‌ترین</small>}</td>
          <td className="numeric">{offer.transitDays.toLocaleString("fa-IR")}{offer.forwarder === comparison.fastest && <small> سریع‌ترین</small>}</td>
          <td>{offer.validUntil ? new Date(offer.validUntil).toLocaleDateString("fa-IR") : "نامشخص"}</td>
        </tr>)}</tbody>
      </table>
      <p className="hint">برآورد نمونهٔ گزینهٔ اول: {comparison.estimateUsd?.toLocaleString("en-US") ?? "—"} دلار · {comparison.methodology}</p>
      <p className="hint">{comparison.disclaimer}</p>
    </div> : <p className="hint">هنوز پیشنهادی ثبت نشده است.</p>)}
  </div>;
}
