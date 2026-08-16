import type { ShipmentOption } from "../types";

const modeLabels: Record<ShipmentOption["mode"], string> = {
  sea: "دریایی",
  air: "هوایی",
  land: "زمینی",
};

interface Props {
  options: ShipmentOption[];
}

export default function ShipmentResults({ options }: Props) {
  if (options.length === 0) return null;

  const sorted = [...options].sort((a, b) => Number(b.recommended) - Number(a.recommended));

  return (
    <section className="results">
      <h2>گزینه‌های پیشنهادی</h2>
      <div className="results-grid">
        {sorted.map((option, i) => (
          <article
            key={`${option.forwarder}-${i}`}
            className={`option-card${option.recommended ? " recommended" : ""}`}
          >
            {option.recommended && <span className="badge">پیشنهاد برتر</span>}
            <h3>{option.forwarder}</h3>
            <p className="mode">حمل {modeLabels[option.mode]}</p>
            <dl>
              <div className="row">
                <dt>هزینه تخمینی</dt>
                <dd>${option.estimatedCostUsd.toLocaleString("en-US")}</dd>
              </div>
              <div className="row">
                <dt>زمان تحویل</dt>
                <dd>{option.estimatedDeliveryDays} روز</dd>
              </div>
              <div className="row">
                <dt>ریسک تأخیر</dt>
                <dd>{Math.round(option.delayRiskScore * 100)}٪</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
