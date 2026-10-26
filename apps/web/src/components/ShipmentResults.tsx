import type { ShipmentOption } from "../types";

const modeLabels: Record<ShipmentOption["mode"], string> = { sea: "دریایی", air: "هوایی", land: "زمینی" };

interface Props {
  options: ShipmentOption[];
  confidence?: number;
  onRequestQuotes: () => void;
  requestPending: boolean;
  rfqCreated: boolean;
}

export default function ShipmentResults({ options, confidence, onRequestQuotes, requestPending, rfqCreated }: Props) {
  if (options.length === 0) return <p role="status">گزینه‌ای برای این محموله موجود نیست.</p>;
  const stale = options.some((option) => Date.parse(option.estimateReviewAt) <= Date.now());

  return (
    <section className="results" aria-label="گزینه‌های پیشنهادی">
      <h2>گزینه‌های پیشنهادی</h2>
      {confidence !== undefined && <p className="hint">شاخص برتری نسبی: {Math.round(confidence * 100)}٪ — احتمال آماری یا تضمین نیست.</p>}
      <p className="hint">نرخ‌ها نمونه‌اند. مهلت ۷روزه صرفاً یادآور بازبینی داخلی است، نه اعتبار قیمت فورواردر.</p>
      {stale && <p role="status" className="error">این برآورد نیازمند بازبینی است؛ برای استعلام، پیشنهاد جدید بگیرید.</p>}
      <div className="results-grid">
        {options.map((option, index) => (
          <article key={`${option.forwarder}-${option.mode}-${index}`} className={`option-card${option.recommended ? " recommended" : ""}`}>
            {option.recommended && <span className="badge">پیشنهاد برتر</span>}
            <h3>{option.forwarder}</h3>
            <p className="mode">حمل {modeLabels[option.mode]}</p>
            <dl>
              <div className="row"><dt>هزینهٔ نمونه</dt><dd><bdi>${option.estimatedCostUsd.toLocaleString("en-US")}</bdi></dd></div>
              <div className="row"><dt>زمان تحویل تخمینی</dt><dd>{option.estimatedDeliveryDays} روز</dd></div>
              <div className="row"><dt>ریسک نمونهٔ تأخیر</dt><dd>{Math.round(option.delayRiskScore * 100)}٪</dd></div>
              <div className="row"><dt>امتیاز</dt><dd>{option.score.toFixed(2)}</dd></div>
              {option.chargeableWeightKg !== undefined && <div className="row"><dt>وزن محاسباتی هوایی</dt><dd>{option.chargeableWeightKg.toFixed(1)} کیلوگرم</dd></div>}
              <div className="row"><dt>بازبینی داخلی تا</dt><dd><time dateTime={option.estimateReviewAt}>{new Date(option.estimateReviewAt).toLocaleDateString("fa-IR")}</time></dd></div>
            </dl>
            <p className="reasons">{option.reasons.join(" · ")}</p>
          </article>
        ))}
      </div>
      <button type="button" className="secondary-btn" onClick={onRequestQuotes} disabled={requestPending || stale || rfqCreated}>
        {requestPending ? "در حال ثبت…" : rfqCreated ? "پیش‌نویس استعلام ثبت شد" : "ساخت پیش‌نویس استعلام چندفورواردر"}
      </button>
    </section>
  );
}
