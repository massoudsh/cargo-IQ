import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("submits a shipment request and renders returned options", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request: {
            origin: "China",
            destination: "Iran",
            cargoType: "electronics",
            priority: "balanced",
          },
          options: [
            {
              forwarder: "SilkRoute Logistics",
              mode: "sea",
              estimatedCostUsd: 3900,
              estimatedDeliveryDays: 26,
              delayRiskScore: 0.16,
              recommended: true,
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText("مبدأ"), { target: { value: "China" } });
    fireEvent.change(screen.getByLabelText("مقصد"), { target: { value: "Iran" } });
    fireEvent.change(screen.getByLabelText("نوع کالا"), { target: { value: "electronics" } });
    fireEvent.click(screen.getByRole("button", { name: "دریافت پیشنهاد بهترین گزینه" }));

    await waitFor(() => expect(screen.getByText("SilkRoute Logistics")).toBeInTheDocument());
    expect(screen.getByText("پیشنهاد برتر")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/shipments/recommend",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an error when the recommendation request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(<App />);

    fireEvent.change(screen.getByLabelText("مبدأ"), { target: { value: "China" } });
    fireEvent.change(screen.getByLabelText("مقصد"), { target: { value: "Iran" } });
    fireEvent.change(screen.getByLabelText("نوع کالا"), { target: { value: "electronics" } });
    fireEvent.click(screen.getByRole("button", { name: "دریافت پیشنهاد بهترین گزینه" }));

    await waitFor(() =>
      expect(screen.getByText("دریافت پیشنهاد با خطا مواجه شد. دوباره تلاش کنید.")).toBeInTheDocument(),
    );
  });
});
