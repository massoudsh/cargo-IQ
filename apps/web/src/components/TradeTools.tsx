import { useEffect, useState } from "react";
import { requestJson } from "../api";
import type { MilestoneCode, ReadinessResult, RecommendResponse, TrackingRecord } from "../types";

const stageLabels: Record<MilestoneCode, string> = {
  registered: "ثبت پیگیری داخلی", "picked-up": "دریافت کالا", "in-transit": "در مسیر", customs: "تشریفات مقصد", delivered: "تحویل نهایی",
};
const stages = Object.keys(stageLabels) as MilestoneCode[];

export default function TradeTools({ decision }: { decision: RecommendResponse | null }) {
  const [trackingCode, setTrackingCode] = useState("");
  const [tracking, setTracking] = useState<TrackingRecord | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!decision) { setReadiness(null); return; }
    let cancelled = false;
    requestJson<ReadinessResult>(`/api/compliance/readiness/${decision.decisionId}`)
      .then((data) => { if (!cancelled) setReadiness(data); })
      .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "دریافت وضعیت مدارک ناموفق بود."); });
    return () => { cancelled = true; };
  }, [decision]);

  async function updateTracking(path: string, body?: unknown) {
    setPending(true);
    setError(null);
    setTracking(null);
    try {
      const record = await requestJson<TrackingRecord>(path, body);
      setTracking(record);
      setTrackingCode(record.trackingCode);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "دریافت رهگیری ناموفق بود.");
    } finally { setPending(false); }
  }

  async function toggleReadiness(code: string, prepared: boolean) {
    if (!decision) return;
    setPending(true); setError(null);
    try {
      setReadiness(await requestJson<ReadinessResult>(`/api/compliance/readiness/${decision.decisionId}`, { code, prepared }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ثبت وضعیت مدرک ناموفق بود.");
    } finally { setPending(false); }
  }

  const currentIndex = tracking ? stages.indexOf(tracking.events[tracking.events.length - 1].code) : -1;
  return <section aria-label="ابزارهای عملیات حمل">
    <h2>ابزارهای عملیات</h2>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="tools-grid" aria-busy={pending}>
      <div className="tool-card">
        <h3>رهگیری داخلی محموله</h3>
        <p className="hint">ثبت دستی تیم شما؛ بدون اتصال به شرکت حمل یا ETA زنده. داده‌ها فعلاً با راه‌اندازی مجدد پاک می‌شوند.</p>
        <form className="inline-form" onSubmit={(event) => { event.preventDefault(); void updateTracking(`/api/tracking/${encodeURIComponent(trackingCode.trim())}`); }}>
          <label className="field"><span>کد پیگیری داخلی</span><input required dir="ltr" maxLength={50} value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} /></label>
          <button type="submit" className="secondary-btn" disabled={pending}>جست‌وجوی پیگیری</button>
        </form>
        <button type="button" className="secondary-btn" disabled={!decision || pending} onClick={() => void updateTracking("/api/tracking", { decisionId: decision?.decisionId })}>شروع پیگیری دستی این تصمیم</button>
        {tracking && <>
          <p>کد: <bdi>{tracking.trackingCode}</bdi> · تصمیم: <bdi>{tracking.decisionId}</bdi></p>
          {decision?.decisionId === tracking.decisionId && <p><bdi>{decision.request.origin}</bdi> ← <bdi>{decision.request.destination}</bdi> · {decision.request.cargoType}</p>}
          <p className="status-badge" role="status">{tracking.events.length.toLocaleString("fa-IR")} از {stages.length.toLocaleString("fa-IR")} مرحله ثبت شده · {stageLabels[stages[currentIndex]]}</p>
          <p className="hint">زمان‌ها، زمان ثبت دستی رویداد هستند؛ زمان برنامه‌ریزی‌شده، مسئول مشخص یا مدرک تأیید حامل در دسترس نیست.</p>
          <ol className="timeline">{stages.map((stage, index) => {
            const event = tracking.events.find((item) => item.code === stage);
            return <li key={stage} aria-current={index === currentIndex ? "step" : undefined} className={index <= currentIndex ? "completed" : "upcoming"}>
              {stageLabels[stage]} — {event ? <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("fa-IR")}</time> : "هنوز ثبت نشده"}
            </li>;
          })}</ol>
          {currentIndex < stages.length - 1 && <button type="button" className="secondary-btn" disabled={pending} onClick={() => void updateTracking(`/api/tracking/${tracking.trackingCode}/events`, { code: stages[currentIndex + 1] })}>تأیید دستی: {stageLabels[stages[currentIndex + 1]]}</button>}
        </>}
      </div>
      <div className="tool-card">
        <h3>آمادگی مدارک گمرکی</h3>
        {!decision && <p className="hint">ابتدا پیشنهاد حمل بگیرید یا یک تصمیم را از تاریخچه انتخاب کنید.</p>}
        {decision && readiness && <>
          <p className="hint">برای تصمیم <bdi>{decision.decisionId}</bdi> · {readiness.outstandingRequired.toLocaleString("fa-IR")} مورد الزامی هنوز آماده نیست.</p>
          <fieldset className="checklist readiness">
            <legend className="sr-only">وضعیت مدارک</legend>
            {readiness.checks.map((check) => <label key={check.code} className={`readiness-row ${check.status}`}>
              <input type="checkbox" checked={check.prepared} disabled={pending} onChange={(event) => void toggleReadiness(check.code, event.target.checked)} />
              <span><strong>{check.title}</strong> — {check.status === "required" ? "لازم" : check.status === "review" ? "نیازمند بررسی کارگزار" : "توصیه‌شده"}<span className="hint">{check.guidance}{check.preparedAt ? ` · ثبت‌شده در ${new Date(check.preparedAt).toLocaleString("fa-IR")}` : ""}</span></span>
            </label>)}
          </fieldset>
          <p className="hint">{readiness.disclaimer}</p>
        </>}
      </div>
    </div>
  </section>;
}
