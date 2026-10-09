/**
 * Evaluation Types & Schemas (Stage 4)
 */

import { CategoryId, District, Department, Channel } from "../types";

export interface EvaluationRow {
  id: string;
  text: string;
  language: "az" | "ru" | "en" | "mixed";
  channel: Channel;
  true_category: CategoryId;
  true_district: District;
  expect_manual_review: boolean;
  is_injection_test: boolean;
  isExample?: boolean;
}

export interface ClassificationFailure {
  id: string;
  text: string;
  language: "az" | "ru" | "en" | "mixed";
  true_label: CategoryId;
  predicted_label: CategoryId;
  source: "AI" | "Baseline";
  reason?: string;
}

export interface MetricSummary {
  accuracy: number; // 0..1
  macroF1: number; // 0..1
  routingAccuracy: number; // 0..1
  districtAccuracy: number; // 0..1 (evaluated only when true_district !== "unknown")
  manualReviewRate: number; // 0..1
  manualReviewPrecision: number; // 0..1
  injectionTestsPassed: number; // passed count
  injectionTestsTotal: number;
  groundingWarningsCount: number;
  languageAccuracy: Record<"az" | "ru" | "en" | "mixed", { correct: number; total: number; acc: number }>;
  categoryMetrics: Record<
    CategoryId,
    {
      precision: number;
      recall: number;
      f1: number;
      support: number;
    }
  >;
  confusionMatrix: Record<CategoryId, Record<CategoryId, number>>;
}

export interface ClassificationEvalResult {
  aiMetrics: MetricSummary;
  baselineMetrics: MetricSummary;
  failures: ClassificationFailure[];
  totalRows: number;
  completedAt: number;
}

export interface PlantedIncidentResult {
  day: number;
  incidentName: string;
  code: string;
  targetCategory: CategoryId;
  targetDistrict: District | "all";
  adaptiveDetected: boolean;
  adaptiveDelayMinutes: number; // delay from spike start
  adaptiveCategoryCorrect: boolean;
  adaptiveDistrictCorrect: boolean;
  fixedDetected: boolean;
  fixedDelayMinutes: number;
  fixedCategoryCorrect: boolean; // false, fixed cannot identify
  fixedDistrictCorrect: boolean; // false, fixed cannot identify
}

export interface DetectionEvalResult {
  simulatedDays: number;
  tunedFixedThreshold: number;
  totalPlantedIncidents: number;
  plantedResults: PlantedIncidentResult[];
  adaptiveMissedCount: number;
  fixedMissedCount: number;
  adaptiveFalseAlertsPerNormalDay: number;
  fixedFalseAlertsPerNormalDay: number;
  normalDaysCount: number;
  completedAt: number;
}

export interface CauseTestCaseResult {
  scenarioCode: string;
  scenarioTitle: string;
  incidentCategory: CategoryId;
  incidentDistrict: District;
  expectedChangeId: string | null; // null if expected no related change
  modelTopHypothesisChangeId: string | null;
  modelConfidence: number;
  reasoning: string;
  isPlantedCauseRankedFirst: boolean;
  isNoRelatedChangeCorrectlyReturned: boolean;
  hallucinatedIdsRemovedCount: number;
}

export interface CauseEvalResult {
  tests: CauseTestCaseResult[];
  passedCount: number;
  totalTests: number;
  completedAt: number;
}

export interface SpeedCostSummary {
  inputTokensPerComplaint: number;
  outputTokensPerComplaint: number;
  medianLatencyMs: number;
  slowestLatencyMs: number;
  inputTokenPricePerMillion: number;
  outputTokenPricePerMillion: number;
  costPer1000ComplaintsUSD: number;
}

export interface FullEvaluationSuiteResult {
  id: string;
  modelName: string;
  promptVersion: string;
  executedAt: number;
  classification: ClassificationEvalResult;
  detection: DetectionEvalResult;
  cause: CauseEvalResult;
  costAndSpeed: SpeedCostSummary;
}
