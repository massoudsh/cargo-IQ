import { useEffect, useState } from "react";
import { requestJson } from "../api";
import type { DecisionInsights, DemurrageResult, MilestoneCode, RecommendResponse } from "../types";

const stageLabels: Record<MilestoneCode, string> = {
  registered: "ثبت پیگیری", "picked-up": "دریافت کالا", "in-transit": "در مسیر", customs: "تشریفات مقصد", delivered: "تحویل نهایی",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch { setState("failed"); }
  }
  return <button type="button" className="secondary-btn" onClick={() => void copy()}>{state === "done" ? "کپی شد" : state === "failed" ? "کپی ناموفق بود" : label}</button>;
}

export default function InsightsPanel({ decision }: { decision: RecommendResponse }) {
  const [insights, setInsights] = useState<DecisionInsights | null>(null);
  const [distance, setDistance] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demurrage, setDemurrage] = useState<DemurrageResult | null>(null);
  const [demurrageError, setDemurrageError] = useState<string | null>(null);
  const [formal, setFormal] = useState({ arrivalDate: "", gateOutDate: "", freeDays: "7", dailyRateUsd: "", containers: "1" });

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    const query = distance ? `?distanceKm=${encodeURIComponent(distance)}` : "";
    requestJson<DecisionInsights>(`/api/insights/${decision.decisionId}${query}`)
      .then((data) => { if (!cancelled) { setInsights(data); setError(null); } })
      .catch((failure) => { if (!cancelled) setError(failure instanceof Error ? failure.message : "دریافت تحلیل‌ها ناموفق بود."); });
    return () => { cancelled = true; };
  }, [decision.decisionId, distance, loaded]);

  async function estimateDemurrage() {
    setDemurrageError(null); setDemurrage(null);
    try {
      setDemurrage(await requestJson<DemurrageResult>("/api/insights/demurrage", {
        arrivalDate: new Date(`${formal.arrivalDate}T00:00:00Z`).toISOString(),
        gateOutDate: new Date(`${formal.gateOutDate}T00:00:00Z`).toISOString(),
        freeDays: Number(formal.freeDays),
        dailyRateUsd: Number(formal.dailyRateUsd),
        containers: Number(formal.containers),
      }));
    } catch (failure) {
      setDemurrageError(failure instanceof Error ? failure.message : "محاسبهٔ دموراژ ناموفق بود.");
    }
  }

  const estimates = insights?.emissions?.estimates ?? [];
  const schedule = insights?.schedule ?? [];
  const maxCo2 = Math.max(1, ...estimates.map((estimate) => estimate.co2eKg));
  const now = Date.now();

  return <section id="insights" tabIndex={-1} aria-label="تحلیل سفر و هزینه‌های بندری" aria-busy={!insights && !error}>
    <h2>تحلیل سفر و هزینه‌های بندری</h2>
    <p className="hint">تحلیل‌ها برای همین تصمیم محاسبه می‌شوند و برآورد برنامه‌ریزی‌اند؛ نه گزارش رسمی انتشار، نه طبقه‌بندی گمرکی.</p>
    {!loaded && <button type="button" className="secondary-btn" onClick={() => setLoaded(true)}>محاسبهٔ تحلیل این تصمیم</button>}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="tools-grid">
      <div className="tool-card">
        <h3>برآورد انتشار کربن</h3>
        <label className="field"><span>فاصلهٔ مسیر (کیلومتر) — اختیاری</span><input type="number" min={1} max={100000} inputMode="numeric" value={distance} onChange={(event) => setDistance(event.target.value)} placeholder="خالی = جدول تقریبی کریدور" aria-describedby="emissions-help" /></label>
        {insights && <>
          <p className="hint" id="emissions-help">مبنای بار: {estimates[0]?.payloadKg?.toLocaleString("fa-IR") ?? "0"} کیلوگرم · فاصله: {insights.emissions.distanceKm ? `${insights.emissions.distanceKm.toLocaleString("fa-IR")} کیلومتر` : "نامشخص"}</p>
          <ul className="emissions-list">{estimates.map((estimate) => <li key={estimate.forwarder}>
            <span className="emissions-head"><bdi>{estimate.forwarder}</bdi> · <bdi>{estimate.co2eKg.toLocaleString("fa-IR")}</bdi> kg CO₂e{estimate.forwarder === insights.emissions.lowest && <span className="status-badge status-success">کم‌ترین انتشار</span>}</span>
            <span className="bar" aria-hidden="true"><span style={{ inlineSize: `${Math.round((estimate.co2eKg / maxCo2) * 100)}%` }} /></span>
            <span className="sr-only">ضریب {estimate.factorKgPerTonneKm} کیلوگرم بر تن-کیلومتر</span>
          </li>)}</ul>
          {(insights.emissions.notes ?? []).map((note) => <p className="hint" key={note}>{note}</p>)}
          <p className="hint">{insights.emissions.disclaimer}</p>
        </>}
      </div>
      <div className="tool-card">
        <h3>برنامهٔ زمانی پیشنهادی</h3>
        {insights && <>
          <ol className="timeline planned">{schedule.map((item) => {
            const due = Date.parse(item.plannedAt) < now;
            return <li key={item.code} className={due ? "overdue" : "upcoming"}>
              {stageLabels[item.code]} — <time dateTime={item.plannedAt}>{new Date(item.plannedAt).toLocaleDateString("fa-IR")}</time>
              {due && <span className="status-badge status-warning">گذشته از برنامه</span>}
            </li>;
          })}</ol>
          <p className="hint">{insights.scheduleBasis}</p>
        </>}
      </div>
      <div className="tool-card">
        <h3>پیشنهاد کد HS</h3>
        {insights && (insights.hs ? <>
          <p><bdi>{insights.hs.heading}</bdi> · فصل {insights.hs.chapter}</p>
          <p className="hint">{insights.hs.description} · تطبیق بر پایهٔ واژهٔ «{insights.hs.matchedOn}» با اطمینان پایین.</p>
          <p className="hint"><strong>پیشنهاد اولیه است، نه طبقه‌بندی گمرکی.</strong> کد نهایی را با کارگزار یا کتاب تعرفه تأیید کنید؛ نرخ عوارض به کد دقیق وابسته است.</p>
        </> : <p className="hint">برای این نوع کالا تطبیق مطمئنی پیدا نشد. کد HS را با کارگزار تعیین کنید.</p>)}
        {insights && <div className="copy-block"><p className="hint">متن آمادهٔ درخواست نرخ برای ارسال به فورواردر:</p><pre className="rfq-message" dir="auto">{insights.rfqMessage}</pre><CopyButton text={insights.rfqMessage} label="کپی متن درخواست نرخ" /><p className="hint">این متن را خودتان در واتس‌اپ یا ایمیل بفرستید؛ سامانه چیزی ارسال نمی‌کند.</p></div>}
      </div>
      <div className="tool-card">
        <h3>برآورد دموراژ کانتینر</h3>
        <p className="hint">برای حمل دریایی: روزهای نگه‌داری پس از تخلیه در بندر، فراتر از روزهای آزاد. نرخ را از تعرفهٔ حامل وارد کنید.</p>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void estimateDemurrage(); }}>
          <label className="field"><span>تاریخ تخلیه</span><input type="date" required value={formal.arrivalDate} onChange={(event) => setFormal({ ...formal, arrivalDate: event.target.value })} /></label>
          <label className="field"><span>تاریخ خروج از بندر</span><input type="date" required value={formal.gateOutDate} onChange={(event) => setFormal({ ...formal, gateOutDate: event.target.value })} /></label>
          <label className="field"><span>روزهای آزاد</span><input type="number" min={0} max={365} step={1} required value={formal.freeDays} onChange={(event) => setFormal({ ...formal, freeDays: event.target.value })} /></label>
          <label className="field"><span>نرخ روزانه هر کانتینر (دلار)</span><input type="number" min={0} step="any" required value={formal.dailyRateUsd} onChange={(event) => setFormal({ ...formal, dailyRateUsd: event.target.value })} /></label>
          <label className="field"><span>تعداد کانتینر</span><input type="number" min={1} max={100} step={1} required value={formal.containers} onChange={(event) => setFormal({ ...formal, containers: event.target.value })} /></label>
          <button type="submit" className="secondary-btn">محاسبهٔ دموراژ</button>
        </form>
        {demurrageError && <p role="alert" className="error">{demurrageError}</p>}
        {demurrage && <div aria-live="polite">
          <p>هزینهٔ برآوردی: <strong><bdi>{demurrage.totalUsd.toLocaleString("en-US")}</bdi> دلار</strong></p>
          <ul className="hint assumptions">{demurrage.notes.map((note) => <li key={note}>{note}</li>)}<li>{demurrage.disclaimer}</li></ul>
        </div>}
      </div>
    </div>
  </section>;
}
