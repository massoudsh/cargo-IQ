import { useEffect, useRef, useState, type ReactNode } from "react";

const links = [
  ["overview", "نمای کلی"], ["plan", "برنامه‌ریزی حمل"],
  ["history", "تصمیم‌ها و گزارش"], ["operations", "پیگیری و مدارک"],
] as const;

function initialTheme() {
  try {
    const saved = localStorage.getItem("cargoiq-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* Storage may be disabled by browser policy. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(window.location.hash.slice(1) || "overview");
  const [offline, setOffline] = useState(!navigator.onLine);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("cargoiq-theme", theme); } catch { /* Keep the session theme when storage is unavailable. */ }
  }, [theme]);

  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    const hash = () => setActive(window.location.hash.slice(1) || "overview");
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      window.removeEventListener("hashchange", hash);
    };
  }, []);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a>
    <header className="topbar">
      <a className="brand" href="#overview"><img src="/cargoiq-logo.svg" alt="" width="36" height="36" /><bdi>CargoIQ</bdi></a>
      <span className="status-badge">محیط نمونه · بدون اتصال به حامل</span>
      <button className="secondary-btn theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-pressed={theme === "dark"}>حالت تاریک</button>
      <button ref={menuButton} type="button" className="secondary-btn menu-toggle" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen(!menuOpen)}>فهرست</button>
    </header>
    <nav id="primary-navigation" className={`sidebar ${menuOpen ? "is-open" : ""}`} aria-label="ناوبری اصلی" onKeyDown={(event) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); }
    }}>
      <p className="eyebrow">کنسول تصمیم‌گیری</p>
      {links.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={() => {
        setActive(id); setMenuOpen(false); document.getElementById(id)?.focus();
      }}>{label}</a>)}
      <p className="hint">داده‌ها در حافظه نگهداری می‌شوند. قیمت‌ها نمونه‌اند و رزرو یا ارسال خودکار انجام نمی‌شود.</p>
    </nav>
    <main className="page" id="main-content" tabIndex={-1}>
      {offline && <p className="error" role="status">اتصال اینترنت قطع است؛ اطلاعات نمایش‌داده‌شده ممکن است قدیمی باشد. پس از اتصال دوباره تلاش کنید.</p>}
      {children}
    </main>
  </div>;
}
