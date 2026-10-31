import type { RecommendResponse } from "./types";

export interface DecisionFilters {
  query: string;
  from: string;
  to: string;
  status: "all" | "review" | "current";
  order: "newest" | "oldest";
}

export function needsReview(decision: RecommendResponse, now: number) {
  return decision.options.some((option) => Date.parse(option.estimateReviewAt) <= now);
}

export function filterDecisions(decisions: RecommendResponse[], filters: DecisionFilters, now: number) {
  const query = filters.query.trim().toLocaleLowerCase();
  return decisions.filter((decision) => {
    const day = decision.createdAt.slice(0, 10);
    const text = [decision.decisionId, decision.request.origin, decision.request.destination, decision.request.cargoType, ...decision.options.map((option) => option.forwarder)].join(" ").toLocaleLowerCase();
    return (!query || text.includes(query)) && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to)
      && (filters.status === "all" || needsReview(decision, now) === (filters.status === "review"));
  }).sort((a, b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt)) * (filters.order === "newest" ? 1 : -1));
}

export function csvCell(value: string) {
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function decisionCsv(decisions: RecommendResponse[], filters: DecisionFilters, generatedAt: string) {
  const rows = [
    ["CargoIQ decision report — sample estimates, not shipment performance"],
    ["Generated at (UTC)", generatedAt],
    ["Scope", "Current tenant history loaded in this session; filtered preview only"],
    ["Filters", JSON.stringify(filters)],
    ["Decision ID", "Created at (UTC)", "Origin", "Destination", "Cargo", "Top forwarder", "Sample USD", "Estimated days", "Review state"],
    ...decisions.map((decision) => {
      const top = decision.options[0];
      return [decision.decisionId, decision.createdAt, decision.request.origin, decision.request.destination, decision.request.cargoType, top?.forwarder ?? "", String(top?.estimatedCostUsd ?? ""), String(top?.estimatedDeliveryDays ?? ""), needsReview(decision, Date.parse(generatedAt)) ? "Needs review" : "Current estimate"];
    }),
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
