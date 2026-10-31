import { useEffect, useMemo, useState } from "react";
import type { RecommendResponse } from "../types";
import { decisionCsv, filterDecisions, needsReview, type DecisionFilters } from "../decisionReport";
import GlassSurface from "./GlassSurface";
import DecisionTable from "./DecisionTable";

interface Props {
  decisions: RecommendResponse[];
  loaded: boolean;
  busy: boolean;
  onReload: () => void;
  onSelect: (decision: RecommendResponse) => void;
}
const pageSize = 10;
const defaults: DecisionFilters = { query: "", from: "", to: "", status: "all", order: "newest" };

export default function DecisionWorkspace({ decisions, loaded, busy, onReload, onSelect }: Props) {
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [exportState, setExportState] = useState("");
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const filtered = useMemo(() => filterDecisions(decisions, filters, now), [decisions, filters, now]);
  const reviewCount = decisions.filter((decision) => needsReview(decision, now)).length;
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const partners = useMemo(() => {
    const counts = new Map<string, number>();
    for (const decision of filtered) {
      const top = decision.options[0];
      if (top) counts.set(top.forwarder, (counts.get(top.forwarder) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function changeFilters(patch: Partial<DecisionFilters>) {
    setFilters((value) => ({ ...value, ...patch })); setPage(0); setExportState("");
  }
  function showQueue(status: DecisionFilters["status"]) {
    setFilters({ ...defaults, status }); setPage(0); setExportState("");
    window.location.hash = "history";
    document.getElementById("history")?.focus();
    document.getElementById("history")?.scrollIntoView?.({ block: "start" });
  }
  function exportReport() {
    setExportState("در حال آماده‌سازی گزارش…");
    let url: string | undefined;
    try {
      const generatedAt = new Date().toISOString();
      url = URL.createObjectURL(new Blob([decisionCsv(filtered, filters, generatedAt)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = `cargoiq-decisions-${generatedAt.slice(0, 10)}.csv`;
      document.body.append(link); link.click(); link.remove();
      setExportState("فایل گزارش آماده و به مرورگر تحویل شد؛ ذخیره‌شدن آن را در دانلودها بررسی کنید.");
    } catch { setExportState("آماده‌سازی گزارش ناموفق بود؛ دوباره تلاش کنید."); }
    finally { if (url) { const downloadUrl = url; const revoke = URL.revokeObjectURL.bind(URL); window.setTimeout(() => revoke(downloadUrl), 1000); } }
  }

  return <>
    <GlassSurface id="overview" tabIndex={-1} variant="subtle" aria-labelledby="overview-title">
      <p className="eyebrow">از برآورد تا پیگیری داخلی</p><h1 id="overview-title">نمای کلی تصمیم‌های حمل</h1>
      <p className="hint">فقط تاریخچهٔ قابل‌دسترسی این سازمان؛ تعداد تصمیم با تعداد محمولهٔ فعال برابر نیست.</p>
      <div className="kpi-grid">
        {([["تصمیم‌های ثبت‌شده", decisions.length, "all"], ["نیازمند بازبینی داخلی", reviewCount, "review"], ["برآوردهای تازه", decisions.length - reviewCount, "current"]] as const).map(([title, count, status]) => <button className="kpi" key={status} type="button" disabled={!loaded || busy} onClick={() => showQueue(status)}><span>{title}</span><strong>{loaded ? count.toLocaleString("fa-IR") : "—"}</strong><small>مشاهدهٔ تصمیم‌ها</small></button>)}
      </div>
      <p className="hint">آمار تأخیر، تحویل به‌موقع و عملکرد واقعی فورواردر در API فعلی موجود نیست. بازبینی قدیمی به معنی تأخیر محموله نیست.</p>
    </GlassSurface>
    <GlassSurface id="history" tabIndex={-1} className="history" aria-labelledby="history-title" aria-busy={busy}>
      <div className="section-heading"><div><p className="eyebrow">جست‌وجو و بررسی</p><h2 id="history-title">تصمیم‌ها و پیش‌نمایش گزارش</h2></div><button type="button" className="secondary-btn" disabled={busy} onClick={onReload}>تازه‌سازی تاریخچهٔ این سازمان</button></div>
      {!loaded && !busy && <p role="status">برای مشاهدهٔ آمار و گزارش، تاریخچه را تازه‌سازی کنید.</p>}
      {busy && <div className="skeleton" role="status">در حال دریافت اطلاعات…</div>}
      {loaded && <>
        <div className="filter-grid">
          <label className="field"><span>جست‌وجوی تصمیم، مسیر، کالا یا فورواردر</span><input type="search" value={filters.query} onChange={(event) => changeFilters({ query: event.target.value })} /></label>
          <label className="field"><span>از تاریخ (میلادی، UTC)</span><input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => changeFilters({ from: event.target.value })} /></label>
          <label className="field"><span>تا تاریخ (میلادی، UTC)</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => changeFilters({ to: event.target.value })} /></label>
          <label className="field"><span>وضعیت بازبینی</span><select value={filters.status} onChange={(event) => changeFilters({ status: event.target.value as DecisionFilters["status"] })}><option value="all">همه</option><option value="review">نیازمند بازبینی</option><option value="current">برآورد تازه</option></select></label>
          <label className="field"><span>ترتیب تاریخ ثبت</span><select value={filters.order} onChange={(event) => changeFilters({ order: event.target.value as DecisionFilters["order"] })}><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option></select></label>
          <button type="button" className="secondary-btn" onClick={() => { setFilters(defaults); setPage(0); setExportState(""); }}>پاک‌کردن فیلترها</button>
        </div>
        <p role="status">{filtered.length.toLocaleString("fa-IR")} تصمیم مطابق فیلترها</p>
        {filtered.length ? <>
          <DecisionTable decisions={filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)} now={now} disabled={busy} onSelect={onSelect} />
          <nav className="pagination" aria-label="صفحه‌بندی تصمیم‌ها"><button className="secondary-btn" type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>صفحهٔ قبل</button><span>صفحهٔ {(currentPage + 1).toLocaleString("fa-IR")} از {(lastPage + 1).toLocaleString("fa-IR")}</span><button className="secondary-btn" type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>صفحهٔ بعد</button></nav>
          <details><summary>خلاصهٔ فورواردرهای پیشنهادشده</summary><p className="hint">تعداد رتبهٔ اول در تصمیم‌های فیلترشده؛ معیار عملکرد واقعی، تحویل یا کیفیت سرویس نیست. برای بررسی، نام را انتخاب کنید.</p><ul className="partner-list">{partners.map(([name, count]) => <li key={name}><button type="button" className="secondary-btn" onClick={() => changeFilters({ query: name })}><bdi>{name}</bdi> · {count.toLocaleString("fa-IR")} پیشنهاد برتر</button></li>)}</ul></details>
          <div className="report-actions"><p className="hint">خروجی فقط {filtered.length.toLocaleString("fa-IR")} تصمیم فیلترشدهٔ همین تاریخچه را شامل می‌شود؛ همهٔ صفحات، با زمان تولید و فیلترها. فایل ممکن است اطلاعات تجاری داشته باشد.</p><button type="button" className="secondary-btn" disabled={busy} onClick={exportReport}>دریافت گزارش CSV همین نتایج</button></div>
        </> : <p role="status">{decisions.length ? "نتیجه‌ای مطابق فیلترها پیدا نشد؛ فیلترها را تغییر دهید." : "هنوز تصمیمی ثبت نشده است."}</p>}
        {exportState && <p role="status">{exportState}</p>}
      </>}
    </GlassSurface>
  </>;
}
