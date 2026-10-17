import { randomUUID } from "node:crypto";
import type { Feedback, Recommendation } from "./types.js";

export interface DecisionStore {
  saveRecommendation(tenantId: string, recommendation: Recommendation): void;
  listRecommendations(tenantId: string): Recommendation[];
  getRecommendation(tenantId: string, decisionId: string): Recommendation | undefined;
  saveFeedback(tenantId: string, feedback: Feedback): void;
  listFeedback(tenantId: string, decisionId: string): Feedback[];
}

export class InMemoryDecisionStore implements DecisionStore {
  private readonly recommendations = new Map<string, Recommendation[]>();
  private readonly feedback = new Map<string, Feedback[]>();

  saveRecommendation(tenantId: string, recommendation: Recommendation) {
    const decisions = this.recommendations.get(tenantId) ?? [];
    decisions.unshift(recommendation);
    this.recommendations.set(tenantId, decisions);
  }

  listRecommendations(tenantId: string) {
    return [...(this.recommendations.get(tenantId) ?? [])];
  }

  getRecommendation(tenantId: string, decisionId: string) {
    return this.recommendations.get(tenantId)?.find((decision) => decision.decisionId === decisionId);
  }

  saveFeedback(tenantId: string, feedback: Feedback) {
    const items = this.feedback.get(tenantId) ?? [];
    items.unshift(feedback);
    this.feedback.set(tenantId, items);
  }

  listFeedback(tenantId: string, decisionId: string) {
    return (this.feedback.get(tenantId) ?? []).filter((feedback) => feedback.decisionId === decisionId);
  }
}

export function createDecisionId() {
  return `dec_${randomUUID()}`;
}
