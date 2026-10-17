import type { ShipmentOption } from "../types";

const modeLabels: Record<ShipmentOption["mode"], string> = { sea: "دریایی", air: "هوایی", land: "زمینی" };

interface Props {
  options: ShipmentOption[];
  confidence?: number;
}

export default function ShipmentResults({ options, confidence }: Props) {
  if (options.length === 0) return null;
  const sorted = [...options].sort((a, b) => Number(b.recommended) - Number(a.recommended));

  return (
    <section className="results">
      <h2>گزینه‌های پیشنهادی</h2>
      {confidence !== undefined && <p className="confidence">اطمینان پیشنهاد: {Math.round(confidence * 100)}٪</p>}
      <div className="results-grid">
        {sorted.map((option, i) => (
          <article key={`${option.forwarder}-${i}`} className={`option-card${option.recommended ? " recommended" : ""}`}>
            {option.recommended && <span className="badge">پیشنهاد برتر</span>}
            <h3>{option.forwarder}</h3>
            <p className="mode">حمل {modeLabels[option.mode]}</p>
            <dl>
              <div className="row"><dt>هزینه تخمینی</dt><dd>${option.estimatedCostUsd.toLocaleString("en-US")}</dd></div>
              <div className="row"><dt>زمان تحویل</dt><dd>{option.estimatedDeliveryDays} روز</dd></div>
              <div className="row"><dt>ریسک تأخیر</dt><dd>{Math.round(option.delayRiskScore * 100)}٪</dd></div>
              <div className="row"><dt>امتیاز</dt><dd>{option.score.toFixed(2)}</dd></div>
            </dl>
            <p className="reasons">{option.reasons.join(" · ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
