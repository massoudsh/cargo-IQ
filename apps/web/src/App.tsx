import { useState } from "react";
import { requestJson } from "./api";
import ShipmentForm from "./components/ShipmentForm";
import ShipmentResults from "./components/ShipmentResults";
import TradeTools from "./components/TradeTools";
import type { RecommendResponse, RfqRequest, ShipmentRequest } from "./types";

export default function App() {
  const [decision, setDecision] = useState<RecommendResponse | null>(null);
  const [history, setHistory] = useState<RecommendResponse[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [rfq, setRfq] = useState<RfqRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(request: ShipmentRequest) {
    setLoading(true);
    setError(null);
    setDecision(null);
    setRfq(null);
    try {
      setDecision(await requestJson<RecommendResponse>("/api/shipments/recommend", request));
      setHistoryLoaded(false);
    } catch {
      setError("دریافت پیشنهاد با خطا مواجه شد. دوباره تلاش کنید.");
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
    <main className="page">
      <header className="hero">
        <img className="logo" src="/cargoiq-logo.svg" alt="" width="88" height="88" />
        <h1>CargoIQ</h1>
        <p className="tagline">هر محموله، بهترین تصمیم.</p>
      </header>
      <p className="description">مقایسهٔ هزینه، زمان و ریسک حمل بین‌المللی — نسخهٔ آزمایشی با دادهٔ نمونه، بدون رزرو یا ارسال خودکار.</p>
      <ShipmentForm loading={loading || actionPending} onSubmit={handleSubmit} />
      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p role="status">در حال مقایسهٔ گزینه‌ها…</p>}
      <section className="history" aria-label="تاریخچهٔ تصمیم‌ها">
        <button type="button" className="secondary-btn" disabled={loading || actionPending} onClick={() => void loadHistory()}>تازه‌سازی تاریخچهٔ این سازمان</button>
        {historyLoaded && (history.length ? <ul>{history.map((item) => <li key={item.decisionId}>
          <button type="button" className="secondary-btn" disabled={loading || actionPending} onClick={() => { setDecision(item); setRfq(null); setError(null); }}>
            {item.request.origin} ← {item.request.destination} · {new Date(item.createdAt).toLocaleDateString("fa-IR")}
          </button>
        </li>)}</ul> : <p role="status">هنوز تصمیمی ثبت نشده است.</p>)}
      </section>
      {decision && <>
        <ShipmentResults options={decision.options} confidence={decision.confidence} onRequestQuotes={() => void requestQuotes()} requestPending={actionPending} rfqCreated={rfq !== null} />
        {rfq && <p role="status" className="success">پیش‌نویس محلی استعلام ثبت شد: <bdi>{rfq.rfqId}</bdi> · پایان مهلت پیگیری: {new Date(rfq.expiresAt).toLocaleString("fa-IR")} — به هیچ فورواردر ارسال نشده است.</p>}
      </>}
      <TradeTools key={decision?.decisionId ?? "no-decision"} decision={decision} />
    </main>
  );
}
