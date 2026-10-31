import type { RecommendResponse } from "../types";
import { needsReview } from "../decisionReport";

interface Props {
  decisions: RecommendResponse[];
  now: number;
  disabled: boolean;
  onSelect: (decision: RecommendResponse) => void;
}

export default function DecisionTable({ decisions, now, disabled, onSelect }: Props) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label="جدول تصمیم‌ها؛ برای مشاهدهٔ ستون‌ها پیمایش کنید">
    <table>
      <caption>تصمیم‌های ثبت‌شده؛ هزینه و زمان، برآورد نمونه هستند نه عملکرد واقعی.</caption>
      <thead><tr><th scope="col">مسیر و شناسه</th><th scope="col">کالا</th><th scope="col">فورواردر برتر</th><th scope="col">هزینهٔ نمونه (USD)</th><th scope="col">بازبینی</th><th scope="col">عملیات</th></tr></thead>
      <tbody>{decisions.map((item) => <tr key={item.decisionId}>
        <th scope="row"><bdi>{item.request.origin}</bdi> ← <bdi>{item.request.destination}</bdi><small><bdi>{item.decisionId}</bdi></small><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("fa-IR")}</time></th>
        <td>{item.request.cargoType}</td><td><bdi>{item.options[0]?.forwarder ?? "—"}</bdi></td>
        <td className="numeric"><bdi>{item.options[0]?.estimatedCostUsd.toLocaleString("fa-IR") ?? "—"}</bdi></td>
        <td><span className={`status-badge ${needsReview(item, now) ? "status-warning" : "status-success"}`}>{needsReview(item, now) ? "نیازمند بازبینی" : "برآورد تازه"}</span></td>
        <td><button type="button" className="secondary-btn" disabled={disabled} onClick={() => onSelect(item)} aria-label={`${item.request.origin} ← ${item.request.destination} · ${new Date(item.createdAt).toLocaleDateString("fa-IR")}`}>بررسی تصمیم</button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
