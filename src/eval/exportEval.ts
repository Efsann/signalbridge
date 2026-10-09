/**
 * Evaluation Export Utility (Stage 4)
 * Generates JSON and CSV with config, model name, prompt version, timestamps,
 * metrics, failure entries, and disclosure table.
 */

import { FullEvaluationSuiteResult } from "./types";
import { GEMINI_MODEL, PROMPT_VERSION } from "../config";
import { DISCLOSURE_LIMITATIONS, REAL_SOURCES } from "./disclosureConstants";

export function exportEvaluationToJSON(evalResult: FullEvaluationSuiteResult): string {
  const exportPayload = {
    metadata: {
      exportTimestamp: new Date().toISOString(),
      model: evalResult.modelName,
      promptVersion: evalResult.promptVersion,
      platform: "SignalBridge NOC Evaluation Suite",
    },
    disclosure: {
      statement:
        "No real operator data is used. All complaints, change-log entries and incidents are synthetic. Category and region weights are assumptions inspired by published figures, not measured data.",
      publishedSources: REAL_SOURCES,
      limitations: DISCLOSURE_LIMITATIONS,
    },
    results: evalResult,
  };

  return JSON.stringify(exportPayload, null, 2);
}

export function exportEvaluationToCSV(evalResult: FullEvaluationSuiteResult): string {
  const lines: string[] = [];

  // 1. Header info
  lines.push("SignalBridge Evaluation Report");
  lines.push(`Executed At,${new Date(evalResult.executedAt).toISOString()}`);
  lines.push(`Model,${evalResult.modelName}`);
  lines.push(`Prompt Version,${evalResult.promptVersion}`);
  lines.push("");

  // 2. High-level Side-by-Side Comparison
  lines.push("=== CLASSIFICATION & ROUTING (AI vs BASELINE) ===");
  lines.push("Metric,AI Model,Baseline Router");
  lines.push(`Overall Accuracy,${(evalResult.classification.aiMetrics.accuracy * 100).toFixed(1)}%,${(evalResult.classification.baselineMetrics.accuracy * 100).toFixed(1)}%`);
  lines.push(`Macro-F1,${(evalResult.classification.aiMetrics.macroF1 * 100).toFixed(1)}%,${(evalResult.classification.baselineMetrics.macroF1 * 100).toFixed(1)}%`);
  lines.push(`Routing Accuracy (Department),${(evalResult.classification.aiMetrics.routingAccuracy * 100).toFixed(1)}%,${(evalResult.classification.baselineMetrics.routingAccuracy * 100).toFixed(1)}%`);
  lines.push(`District Accuracy (Known Districts),${(evalResult.classification.aiMetrics.districtAccuracy * 100).toFixed(1)}%,${(evalResult.classification.baselineMetrics.districtAccuracy * 100).toFixed(1)}%`);
  lines.push(`Manual Review Rate,${(evalResult.classification.aiMetrics.manualReviewRate * 100).toFixed(1)}%,${(evalResult.classification.baselineMetrics.manualReviewRate * 100).toFixed(1)}%`);
  lines.push(`Manual Review Precision,${(evalResult.classification.aiMetrics.manualReviewPrecision * 100).toFixed(1)}%,${(evalResult.classification.baselineMetrics.manualReviewPrecision * 100).toFixed(1)}%`);
  lines.push(`Prompt Injection Tests Passed,${evalResult.classification.aiMetrics.injectionTestsPassed}/${evalResult.classification.aiMetrics.injectionTestsTotal},${evalResult.classification.baselineMetrics.injectionTestsPassed}/${evalResult.classification.baselineMetrics.injectionTestsTotal}`);
  lines.push(`Grounding Warnings Count,${evalResult.classification.aiMetrics.groundingWarningsCount},N/A`);
  lines.push("");

  // 3. Language breakdown
  lines.push("=== ACCURACY BY LANGUAGE ===");
  lines.push("Language,AI Accuracy,Baseline Accuracy");
  (["az", "ru", "en", "mixed"] as const).forEach((lang) => {
    const ai = evalResult.classification.aiMetrics.languageAccuracy[lang];
    const base = evalResult.classification.baselineMetrics.languageAccuracy[lang];
    lines.push(`${lang},${(ai.acc * 100).toFixed(1)}% (${ai.correct}/${ai.total}),${(base.acc * 100).toFixed(1)}% (${base.correct}/${base.total})`);
  });
  lines.push("");

  // 4. Detection Test
  lines.push("=== DETECTION TEST (20 DAYS) ===");
  lines.push(`Tuned Fixed Threshold,${evalResult.detection.tunedFixedThreshold} complaints/15m`);
  lines.push(`Planted Incidents Caught (Adaptive),${evalResult.detection.totalPlantedIncidents - evalResult.detection.adaptiveMissedCount}/${evalResult.detection.totalPlantedIncidents}`);
  lines.push(`Planted Incidents Caught (Fixed),${evalResult.detection.totalPlantedIncidents - evalResult.detection.fixedMissedCount}/${evalResult.detection.totalPlantedIncidents}`);
  lines.push(`False Alerts per Normal Day (Adaptive),${evalResult.detection.adaptiveFalseAlertsPerNormalDay.toFixed(2)}`);
  lines.push(`False Alerts per Normal Day (Fixed),${evalResult.detection.fixedFalseAlertsPerNormalDay.toFixed(2)}`);
  lines.push("");

  // 5. Cost & Latency
  lines.push("=== SPEED & COST ===");
  lines.push(`Avg Input Tokens / Complaint,${evalResult.costAndSpeed.inputTokensPerComplaint}`);
  lines.push(`Avg Output Tokens / Complaint,${evalResult.costAndSpeed.outputTokensPerComplaint}`);
  lines.push(`Median Latency (ms),${evalResult.costAndSpeed.medianLatencyMs}`);
  lines.push(`Slowest Latency (ms),${evalResult.costAndSpeed.slowestLatencyMs}`);
  lines.push(`Configured Input Price / 1M USD,$${evalResult.costAndSpeed.inputTokenPricePerMillion}`);
  lines.push(`Configured Output Price / 1M USD,$${evalResult.costAndSpeed.outputTokenPricePerMillion}`);
  lines.push(`Est Cost per 1000 Complaints USD,$${evalResult.costAndSpeed.costPer1000ComplaintsUSD}`);
  lines.push("");

  // 6. Failures Table
  lines.push("=== CLASSIFICATION FAILURES ===");
  lines.push("Source,ID,Language,True Category,Predicted Category,Text,Note");
  evalResult.classification.failures.forEach((f) => {
    const safeText = `"${f.text.replace(/"/g, '""')}"`;
    lines.push(`${f.source},${f.id},${f.language},${f.true_label},${f.predicted_label},${safeText},${f.reason || ""}`);
  });

  return lines.join("\n");
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
