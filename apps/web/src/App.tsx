import { useState } from "react";
import { requestJson } from "./api";
import ShipmentForm from "./components/ShipmentForm";
import ShipmentResults from "./components/ShipmentResults";
import TradeTools from "./components/TradeTools";
import AppShell from "./components/AppShell";
import DecisionWorkspace from "./components/DecisionWorkspace";
import LandedCostPanel from "./components/LandedCostPanel";
import OffersPanel from "./components/OffersPanel";
import InsightsPanel from "./components/InsightsPanel";
import type { RecommendResponse, RfqRequest, ShipmentRequest } from "./types";

export default function App() {
  const [decision, setDecision] = useState<RecommendResponse | null>(null);
  const [history, setHistory] = useState<RecommendResponse[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [rfq, setRfq] = useState<RfqRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fxRate, setFxRate] = useState<number | undefined>(undefined);

  async function handleSubmit(request: ShipmentRequest) {
    setLoading(true);
    setError(null);
    setDecision(null);
    setRfq(null);
    try {
      setDecision(await requestJson<RecommendResponse>("/api/shipments/recommend", request));
      setHistoryLoaded(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "دریافت پیشنهاد با خطا مواجه شد. دوباره تلاش کنید.");
    } finally { setLoading(false); }
  }

  async function requestQuotes() {
    if (!decision) return;
    setActionPending(true);
    setError(null);
    try {
      setRfq(await requestJson<RfqRequest>("/api/quotes/request", { decisionId: decision.decisionId, forwarders: decision.options.map((option) => option.forwarder) }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ثبت استعلام ناموفق بود.");
    } finally { setActionPending(false); }
  }

  async function loadHistory() {
    setActionPending(true);
    setHistoryLoaded(false);
    setHistory([]);
    setError(null);
    try {
      const data = await requestJson<{ decisions: RecommendResponse[] }>("/api/shipments/history");
      setHistory(data.decisions);
      setHistoryLoaded(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "دریافت تاریخچه ناموفق بود.");
    } finally { setActionPending(false); }
  }

  return (
    <AppShell>
      {error && <p className="error" role="alert">{error}</p>}
      <DecisionWorkspace decisions={history} loaded={historyLoaded} busy={loading || actionPending} onReload={() => void loadHistory()} onSelect={(item) => {
        setDecision(item); setRfq(null); setError(null);
        window.setTimeout(() => { document.getElementById("selected-decision")?.focus(); }, 0);
      }} />
      <section id="plan" tabIndex={-1} aria-label="برنامه‌ریزی حمل">
        <ShipmentForm loading={loading || actionPending} onSubmit={handleSubmit} />
      </section>
      {loading && <p className="skeleton" role="status">در حال مقایسهٔ گزینه‌ها…</p>}
      {decision && <section id="selected-decision" tabIndex={-1} aria-label="تصمیم انتخاب‌شده">
        <p className="hint">شناسهٔ تصمیم: <bdi>{decision.decisionId}</bdi> · <bdi>{decision.request.origin}</bdi> ← <bdi>{decision.request.destination}</bdi> · حجم {decision.measures.volumeCbm.toFixed(2)} متر مکعب · وزن واقعی {decision.measures.actualWeightKg.toLocaleString("fa-IR")} کیلوگرم</p>
        <p className="hint">مبنای محاسبه: هوایی {decision.measures.air.chargeableKg.toFixed(1)} کیلوگرم · LCL {decision.measures.seaLcl.revenueTon.toFixed(2)} تن/متر{decision.measures.road.loadingMetres > 0 ? ` · زمینی ${decision.measures.road.loadingMetres.toFixed(2)} متر بارگیری` : ""}</p>
        <ShipmentResults options={decision.options} confidence={decision.confidence} onRequestQuotes={() => void requestQuotes()} requestPending={actionPending} rfqCreated={rfq !== null} fxRate={fxRate} />
        {rfq && <p role="status" className="success">پیش‌نویس محلی استعلام ثبت شد: <bdi>{rfq.rfqId}</bdi> · پایان مهلت پیگیری: {new Date(rfq.expiresAt).toLocaleString("fa-IR")} — به هیچ فورواردر ارسال نشده است.</p>}
      </section>}
      {decision && <section id="pricing" tabIndex={-1} aria-label="هزینهٔ نهایی و پیشنهادها" className="tools-grid">
        <LandedCostPanel decision={decision} fxRate={fxRate} onFxRate={setFxRate} />
        {rfq ? <OffersPanel key={rfq.rfqId} rfq={rfq} /> : <div className="tool-card"><h3>مقایسهٔ پیشنهادهای دریافتی</h3><p className="hint">برای ثبت و مقایسهٔ پیشنهاد واقعی فورواردرها، ابتدا پیش‌نویس استعلام را بسازید.</p></div>}
      </section>}
      {decision && <InsightsPanel key={`insights-${decision.decisionId}`} decision={decision} />}
      <section id="operations" tabIndex={-1} aria-label="پیگیری و مدارک">
        <TradeTools key={decision?.decisionId ?? "no-decision"} decision={decision} />
      </section>
    </AppShell>
  );
}
