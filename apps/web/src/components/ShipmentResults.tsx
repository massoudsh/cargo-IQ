import type { BillingBasis, ShipmentOption } from "../types";

const modeLabels: Record<ShipmentOption["mode"], string> = { sea: "دریایی", air: "هوایی", land: "زمینی" };
const basisLabels: Record<BillingBasis["basis"], string> = {
  "actual-weight": "بر اساس وزن واقعی",
  "volumetric-weight": "بر اساس وزن حجمی",
  "weight-or-measure": "وزن یا حجم، هرکدام بیشتر",
  "loading-metre": "بر اساس متر بارگیری",
};

function billingText(billing: BillingBasis) {
  if (billing.unit === "kg") return `${billing.value.toFixed(1)} کیلوگرم · ${basisLabels[billing.basis]}`;
  if (billing.unit === "ldm") return `${billing.value.toFixed(2)} متر بارگیری · ${basisLabels[billing.basis]}`;
  return `${billing.value.toFixed(2)} تن/متر · ${basisLabels[billing.basis]}`;
}

interface Props {
  options: ShipmentOption[];
  confidence?: number;
  onRequestQuotes: () => void;
  requestPending: boolean;
  rfqCreated: boolean;
  fxRate?: number;
}

export default function ShipmentResults({ options, confidence, onRequestQuotes, requestPending, rfqCreated, fxRate }: Props) {
  if (options.length === 0) return <p role="status">گزینه‌ای برای این محموله موجود نیست.</p>;
  const stale = options.some((option) => Date.parse(option.estimateReviewAt) <= Date.now());

  return (
    <section className="results" aria-label="گزینه‌های پیشنهادی">
      <h2>گزینه‌های پیشنهادی</h2>
      {confidence !== undefined && <p className="hint">شاخص برتری نسبی: {Math.round(confidence * 100)}٪ — احتمال آماری یا تضمین نیست.</p>}
      <p className="hint">نرخ‌ها نمونه‌اند. مهلت ۷روزه صرفاً یادآور بازبینی داخلی است، نه اعتبار قیمت فورواردر. واحد محاسبهٔ هزینه (وزن، تن/متر یا متر بارگیری) با ضریب هر فورواردر متفاوت است.</p>
      {stale && <p role="status" className="error">این برآورد نیازمند بازبینی است؛ برای استعلام، پیشنهاد جدید بگیرید.</p>}
      <div className="results-grid">
        {options.map((option, index) => (
          <article key={`${option.forwarder}-${option.mode}-${index}`} className={`option-card${option.recommended ? " recommended" : ""}`}>
            {option.recommended && <span className="badge">پیشنهاد برتر</span>}
            <h3>{option.forwarder}</h3>
            <p className="mode">حمل {modeLabels[option.mode]}</p>
            <dl>
              <div className="row"><dt>هزینهٔ نمونه</dt><dd><bdi>${option.estimatedCostUsd.toLocaleString("en-US")}</bdi>{fxRate ? <><br /><small className="hint"><bdi>{Math.round(option.estimatedCostUsd * fxRate).toLocaleString("fa-IR")}</bdi> ریال</small></> : null}</dd></div>
              <div className="row"><dt>زمان تحویل تخمینی</dt><dd>{option.estimatedDeliveryDays} روز</dd></div>
              <div className="row"><dt>ریسک نمونهٔ تأخیر</dt><dd>{Math.round(option.delayRiskScore * 100)}٪</dd></div>
              <div className="row"><dt>امتیاز</dt><dd>{option.score.toFixed(2)}</dd></div>
              {option.billing && <div className="row"><dt>مبنای هزینه</dt><dd>{billingText(option.billing)}</dd></div>}
              {option.chargeableWeightKg !== undefined && option.mode === "air" && <div className="row"><dt>وزن محاسباتی هوایی</dt><dd>{option.chargeableWeightKg.toFixed(1)} کیلوگرم</dd></div>}
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
