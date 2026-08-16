import { useState } from "react";
import ShipmentForm from "./components/ShipmentForm";
import ShipmentResults from "./components/ShipmentResults";
import type { RecommendResponse, ShipmentOption, ShipmentRequest } from "./types";

export default function App() {
  const [options, setOptions] = useState<ShipmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(request: ShipmentRequest) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shipments/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(`خطای سرور (${res.status})`);
      const data = (await res.json()) as RecommendResponse;
      setOptions(data.options);
    } catch {
      setError("دریافت پیشنهاد با خطا مواجه شد. دوباره تلاش کنید.");
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <h1>CargoIQ</h1>
        <p className="tagline">هر محموله، بهترین تصمیم.</p>
      </header>
      <p className="description">
        موتور تصمیم‌گیری هوشمند برای انتخاب مسیر، فورواردر و زمان‌بندی حمل بین‌المللی —
        بر اساس هزینه، زمان تحویل و ریسک تأخیر.
      </p>

      <ShipmentForm loading={loading} onSubmit={handleSubmit} />

      {error && <p className="error">{error}</p>}

      <ShipmentResults options={options} />
    </main>
  );
}
