/**
 * Priority Heuristics Engine for SignalBridge
 * Pure deterministic code function deciding incident priority levels.
 * Rules:
 * - Critical: Only if category is in config.CRITICAL_CATEGORIES (empty by default)
 * - High: zScore >= 5.0 OR count >= 25
 * - Medium: Any other valid anomaly alert
 * - Promotion: avgSeverity >= 2.5 promotes Medium to High
 * - Low: Sub-threshold cluster / "Watching"
 */

import { CategoryId, IncidentPriority } from "../types";
import {
  CRITICAL_CATEGORIES,
  HIGH_PRIORITY_ZSCORE,
  HIGH_PRIORITY_COUNT,
  HIGH_PRIORITY_AVG_SEVERITY,
} from "../config";

export interface PriorityDecision {
  priority: IncidentPriority;
  heuristicRule: string;
}

export interface PriorityInput {
  category: CategoryId;
  zScore: number;
  count: number;
  avgSeverity?: number;
  isAlert?: boolean;
}

export function calculatePriority(input: PriorityInput): PriorityDecision {
  const { category, zScore, count, avgSeverity, isAlert = true } = input;

  // 1. Critical Rule (Whitelisted categories only)
  if (CRITICAL_CATEGORIES.includes(category)) {
    return {
      priority: "Critical",
      heuristicRule: `Heuristic: Category "${category}" configured in critical categories roster`,
    };
  }

  // If not crossing threshold, classified as Watching / Low
  if (!isAlert) {
    return {
      priority: "Low",
      heuristicRule: "Heuristic: Sub-threshold cluster monitored in Watching status",
    };
  }

  // 2. High Priority Rule (Statistical surge or massive volume)
  if (zScore >= HIGH_PRIORITY_ZSCORE || count >= HIGH_PRIORITY_COUNT) {
    const reasons: string[] = [];
    if (zScore >= HIGH_PRIORITY_ZSCORE) reasons.push(`Z-Score ${zScore.toFixed(1)} ≥ ${HIGH_PRIORITY_ZSCORE}`);
    if (count >= HIGH_PRIORITY_COUNT) reasons.push(`Count ${count} ≥ ${HIGH_PRIORITY_COUNT}`);
    return {
      priority: "High",
      heuristicRule: `Heuristic: ${reasons.join(" and ")}`,
    };
  }

  // 3. Severity Promotion Rule (AI severity signal elevates Medium to High)
  if (avgSeverity !== undefined && avgSeverity >= HIGH_PRIORITY_AVG_SEVERITY) {
    return {
      priority: "High",
      heuristicRule: `Heuristic: AI average severity signal (${avgSeverity.toFixed(2)} ≥ ${HIGH_PRIORITY_AVG_SEVERITY}) elevated priority to High`,
    };
  }

  // 4. Default Alert Priority (Medium)
  return {
    priority: "Medium",
    heuristicRule: "Heuristic: Standard anomaly alert crossing statistical threshold",
  };
}
