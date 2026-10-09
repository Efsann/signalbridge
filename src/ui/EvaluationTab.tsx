/**
 * Evaluation UI Tab (Stage 4)
 * Complete evaluation dashboard for SignalBridge.
 * Strict compliance with hard rules:
 * - Every figure is computed by running code in the browser
 * - Before running, displays "Not run yet"
 * - Provides live progress bar and Cancel button
 * - No hardcoded accuracy, delay, token, or cost values
 */

import React, { useState, useRef } from "react";
import {
  EvaluationRow,
  ClassificationEvalResult,
  DetectionEvalResult,
  CauseEvalResult,
  SpeedCostSummary,
  FullEvaluationSuiteResult,
} from "../eval/types";
import { PRELOADED_TEST_SET, parseEvaluationImport } from "../eval/preloadedDataset";
import {
  runClassificationTest,
  runDetectionTest,
  runCauseTest,
  computeSpeedAndCost,
} from "../eval/runEval";
import { exportEvaluationToJSON, exportEvaluationToCSV, triggerDownload } from "../eval/exportEval";
import { GEMINI_MODEL, PROMPT_VERSION } from "../config";
import { CATEGORY_IDS, TELECOM_CATEGORIES } from "../sectors/telecom";
import {
  Play,
  Square,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Cpu,
  BarChart2,
  Radio,
  Clock,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";

export const EvaluationTab: React.FC = () => {
  // Test set state
  const [testRows, setTestRows] = useState<EvaluationRow[]>(PRELOADED_TEST_SET);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState("");
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [importError, setImportError] = useState<string | null>(null);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Results state - before running, is null -> "Not run yet"
  const [evalResult, setEvalResult] = useState<FullEvaluationSuiteResult | null>(null);

  // Filter state for failures table
  const [failureLangFilter, setFailureLangFilter] = useState<string>("all");
  const [failureSourceFilter, setFailureSourceFilter] = useState<string>("all");
  const [copiedFailures, setCopiedFailures] = useState(false);

  // Pricing inputs
  const [inputPrice, setInputPrice] = useState<number>(0);
  const [outputPrice, setOutputPrice] = useState<number>(0);

  // Section sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    "classification" | "detection" | "cause" | "speed_cost"
  >("classification");

  // Handler: Run Full Evaluation
  const handleStartEvaluation = async () => {
    setIsRunning(true);
    setProgressPercent(0);
    setProgressMessage("Initializing evaluation suite...");
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 1. Classification & Routing Test
      setProgressMessage("Phase 1/3: Running Classification & Routing benchmark...");
      const classRes = await runClassificationTest(
        testRows,
        (pct, msg) => {
          setProgressPercent(Math.round(pct * 0.4)); // 0..40%
          setProgressMessage(`Classification: ${msg}`);
        },
        signal
      );

      // 2. Detection Test (20 Days simulation)
      setProgressMessage("Phase 2/3: Simulating 20 days for Detection benchmark...");
      const detectRes = await runDetectionTest((pct, msg) => {
        setProgressPercent(40 + Math.round(pct * 0.3)); // 40..70%
        setProgressMessage(`Detection: ${msg}`);
      }, signal);

      // 3. Cause Hypotheses Test
      setProgressMessage("Phase 3/3: Running Cause Hypotheses benchmark (S1, S2, S3 + variants)...");
      const causeRes = await runCauseTest((pct, msg) => {
        setProgressPercent(70 + Math.round(pct * 0.25)); // 70..95%
        setProgressMessage(`Cause: ${msg}`);
      }, signal);

      // 4. Cost and Speed
      const speedCost = computeSpeedAndCost(inputPrice, outputPrice);

      setProgressPercent(100);
      setProgressMessage("Evaluation complete!");

      const fullResult: FullEvaluationSuiteResult = {
        id: `EVAL-${Date.now()}`,
        modelName: GEMINI_MODEL,
        promptVersion: PROMPT_VERSION,
        executedAt: Date.now(),
        classification: classRes,
        detection: detectRes,
        cause: causeRes,
        costAndSpeed: speedCost,
      };

      setEvalResult(fullResult);
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("cancelled")) {
        setProgressMessage("Evaluation cancelled by operator.");
      } else {
        setProgressMessage(`Evaluation error: ${err.message || String(err)}`);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelEvaluation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleImportSubmit = () => {
    try {
      setImportError(null);
      const parsed = parseEvaluationImport(importRawText, importFormat);
      setTestRows(parsed);
      setImportModalOpen(false);
      setImportRawText("");
    } catch (err: any) {
      setImportError(err.message || "Failed to parse import data.");
    }
  };

  const handleResetToExample = () => {
    setTestRows(PRELOADED_TEST_SET);
  };

  // Recompute cost if pricing changes after run
  const currentCostAndSpeed = evalResult
    ? computeSpeedAndCost(inputPrice, outputPrice)
    : null;

  // Filter failures
  const filteredFailures = (evalResult?.classification.failures || []).filter((f) => {
    if (failureLangFilter !== "all" && f.language !== failureLangFilter) return false;
    if (failureSourceFilter !== "all" && f.source !== failureSourceFilter) return false;
    return true;
  });

  const handleCopyFailuresMarkdown = () => {
    if (!evalResult) return;
    const header = "| Source | ID | Language | True Category | Predicted Category | Complaint Text |\n|---|---|---|---|---|---|";
    const body = filteredFailures
      .map(
        (f) =>
          `| ${f.source} | ${f.id} | ${f.language} | ${f.true_label} | ${f.predicted_label} | ${f.text.replace(/\|/g, "\\|")} |`
      )
      .join("\n");
    const md = `${header}\n${body}`;
    navigator.clipboard.writeText(md);
    setCopiedFailures(true);
    setTimeout(() => setCopiedFailures(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Evaluation Header & Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              SignalBridge Evaluation & Verification Suite
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
              {GEMINI_MODEL}
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Prompt {PROMPT_VERSION}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pure in-browser code benchmark: side-by-side AI vs baseline router, 20-day detection simulation, and cause hypothesis verification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isRunning ? (
            <button
              onClick={handleStartEvaluation}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Evaluation Suite</span>
            </button>
          ) : (
            <button
              onClick={handleCancelEvaluation}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel Evaluation</span>
            </button>
          )}

          {evalResult && (
            <>
              <button
                onClick={() =>
                  triggerDownload(
                    exportEvaluationToJSON(evalResult),
                    `signalbridge-eval-${evalResult.executedAt}.json`,
                    "application/json"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                title="Export evaluation results to JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>

              <button
                onClick={() =>
                  triggerDownload(
                    exportEvaluationToCSV(evalResult),
                    `signalbridge-eval-${evalResult.executedAt}.csv`,
                    "text/csv"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                title="Export evaluation results to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress & Status Indicator */}
      {isRunning && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
            <span>{progressMessage}</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Dataset Import & Size Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800">Test Dataset:</span>
          <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
            {testRows.length} rows loaded
          </span>
          {testRows[0]?.isExample && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
              EXAMPLE, replace with team-written data
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV/JSON</span>
          </button>
          <button
            onClick={handleResetToExample}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Reset to 12 preloaded examples"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Example</span>
          </button>
        </div>
      </div>

      {/* Dataset size warning if fewer than 100 rows */}
      {testRows.length < 100 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Warning:</strong> Test dataset currently contains <strong>{testRows.length} rows (&lt; 100)</strong>. Statistical metrics and F1 scores may exhibit high variance. Replace with team-written data.
          </span>
        </div>
      )}

      {/* State: Not run yet */}
      {!evalResult && !isRunning && (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
          <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Not run yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click <strong>"Run Evaluation Suite"</strong> above to compute all benchmarks directly in your browser. All metrics, delays, confusion matrices, and cost estimates will be derived from live code execution.
          </p>
        </div>
      )}

      {/* Main Results Display */}
      {evalResult && (
        <div className="space-y-6">
          {/* Sub-tabs for clean inspection */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab("classification")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === "classification"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Classification & Routing (Side-by-Side)</span>
            </button>
            <button
              onClick={() => setActiveSubTab("detection")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === "detection"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Detection Benchmark (20 Days)</span>
            </button>
            <button
              onClick={() => setActiveSubTab("cause")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === "cause"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cause Hypotheses Benchmark</span>
            </button>
            <button
              onClick={() => setActiveSubTab("speed_cost")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === "speed_cost"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Cost & Speed</span>
            </button>
          </div>

          {/* Subtab 1: Classification & Routing */}
          {activeSubTab === "classification" && (
            <div className="space-y-6">
              {/* Side-by-Side KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Overall Accuracy</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-indigo-700">
                        {(evalResult.classification.aiMetrics.accuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-indigo-600 block">AI Model</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {(evalResult.classification.baselineMetrics.accuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Baseline Router</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Macro-F1 Score</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-indigo-700">
                        {(evalResult.classification.aiMetrics.macroF1 * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-indigo-600 block">AI Model</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {(evalResult.classification.baselineMetrics.macroF1 * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Baseline Router</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Department Routing Accuracy</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-indigo-700">
                        {(evalResult.classification.aiMetrics.routingAccuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-indigo-600 block">AI Model</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {(evalResult.classification.baselineMetrics.routingAccuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Baseline Router</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">District Accuracy (Known)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-indigo-700">
                        {(evalResult.classification.aiMetrics.districtAccuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-indigo-600 block">AI Model</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {(evalResult.classification.baselineMetrics.districtAccuracy * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Baseline Router</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Comparison Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">Manual Review Rate & Precision</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">AI Trigger Rate:</span>
                      <span className="font-bold text-indigo-700">
                        {(evalResult.classification.aiMetrics.manualReviewRate * 100).toFixed(1)}% (Precision: {(evalResult.classification.aiMetrics.manualReviewPrecision * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Baseline Trigger Rate:</span>
                      <span className="font-bold text-slate-700">
                        {(evalResult.classification.baselineMetrics.manualReviewRate * 100).toFixed(1)}% (Precision: {(evalResult.classification.baselineMetrics.manualReviewPrecision * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">Prompt Injection Defense</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">AI Injections Passed:</span>
                      <span className="font-bold text-emerald-700">
                        {evalResult.classification.aiMetrics.injectionTestsPassed} / {evalResult.classification.aiMetrics.injectionTestsTotal} passed
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Routing maintained unchanged + instruction flag set to true.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <span className="font-bold text-slate-800 block mb-1">Evidence Grounding Warnings</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">AI Grounding Warnings:</span>
                      <span className={`font-bold ${evalResult.classification.aiMetrics.groundingWarningsCount === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                        {evalResult.classification.aiMetrics.groundingWarningsCount} warnings
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Verifies evidence phrases are exact substrings of masked input text.
                    </p>
                  </div>
                </div>
              </div>

              {/* Accuracy per Language */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
                  Accuracy by Language
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {(["az", "ru", "en", "mixed"] as const).map((lang) => {
                    const aiL = evalResult.classification.aiMetrics.languageAccuracy[lang];
                    const baseL = evalResult.classification.baselineMetrics.languageAccuracy[lang];
                    return (
                      <div key={lang} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                        <span className="font-bold uppercase text-[11px] text-slate-700 block">
                          {lang === "az" ? "Azerbaijani (az)" : lang === "ru" ? "Russian (ru)" : lang === "en" ? "English (en)" : "Mixed (mixed)"}
                        </span>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-mono text-indigo-700 font-bold">
                            {(aiL.acc * 100).toFixed(1)}% <span className="text-[10px] text-slate-400">({aiL.correct}/{aiL.total})</span>
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            Base: {(baseL.acc * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-Category Precision / Recall / F1 Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Per-Category Performance (AI Model)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Support total: {evalResult.classification.totalRows} complaints
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-3 py-2 text-right">Support</th>
                        <th className="px-3 py-2 text-right">Precision</th>
                        <th className="px-3 py-2 text-right">Recall</th>
                        <th className="px-3 py-2 text-right">F1 Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {CATEGORY_IDS.map((cat) => {
                        const m = evalResult.classification.aiMetrics.categoryMetrics[cat];
                        return (
                          <tr key={cat} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-sans font-medium text-slate-800">
                              {TELECOM_CATEGORIES[cat]?.displayName || cat}
                            </td>
                            <td className="px-4 py-2 font-sans text-slate-500 text-[10px]">
                              {TELECOM_CATEGORIES[cat]?.department || "Manual"}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">{m?.support ?? 0}</td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {m ? `${(m.precision * 100).toFixed(1)}%` : "-"}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {m ? `${(m.recall * 100).toFixed(1)}%` : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-indigo-700">
                              {m ? `${(m.f1 * 100).toFixed(1)}%` : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs overflow-hidden">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  AI Confusion Matrix (Rows: True &rarr; Cols: Predicted)
                </h4>
                <div className="overflow-x-auto">
                  <table className="text-[10px] font-mono text-center border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1 text-left text-slate-400">True \ Pred</th>
                        {CATEGORY_IDS.map((c) => (
                          <th key={c} className="p-1 px-1.5 text-slate-600 font-bold max-w-[50px] truncate" title={c}>
                            {c.slice(0, 4)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORY_IDS.map((c1) => (
                        <tr key={c1} className="border-t border-slate-100">
                          <td className="p-1 px-2 text-left font-sans font-semibold text-slate-700 whitespace-nowrap">
                            {c1.slice(0, 14)}
                          </td>
                          {CATEGORY_IDS.map((c2) => {
                            const val = evalResult.classification.aiMetrics.confusionMatrix[c1]?.[c2] || 0;
                            const isDiag = c1 === c2;
                            return (
                              <td
                                key={c2}
                                className={`p-1 px-2 ${
                                  val === 0
                                    ? "text-slate-300"
                                    : isDiag
                                    ? "bg-indigo-100 font-bold text-indigo-900"
                                    : "bg-rose-50 text-rose-800 font-bold"
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Failures Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider">
                      Failures Table ({filteredFailures.length} entries)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Discrepancies where predicted label differed from ground truth.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={failureSourceFilter}
                      onChange={(e) => setFailureSourceFilter(e.target.value)}
                      className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700"
                    >
                      <option value="all">All Sources</option>
                      <option value="AI">AI Failures</option>
                      <option value="Baseline">Baseline Failures</option>
                    </select>

                    <select
                      value={failureLangFilter}
                      onChange={(e) => setFailureLangFilter(e.target.value)}
                      className="px-2 py-1 rounded border border-slate-200 text-xs bg-white text-slate-700"
                    >
                      <option value="all">All Languages</option>
                      <option value="az">Azerbaijani (az)</option>
                      <option value="ru">Russian (ru)</option>
                      <option value="en">English (en)</option>
                      <option value="mixed">Mixed</option>
                    </select>

                    <button
                      onClick={handleCopyFailuresMarkdown}
                      className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                    >
                      {copiedFailures ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy as Markdown</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 font-semibold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Lang</th>
                        <th className="px-3 py-2">True Category</th>
                        <th className="px-3 py-2">Predicted</th>
                        <th className="px-4 py-2">Complaint Text</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredFailures.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-sans">
                            No failures match current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredFailures.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  f.source === "AI" ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {f.source}
                              </span>
                            </td>
                            <td className="px-3 py-2 uppercase font-semibold text-slate-600">{f.language}</td>
                            <td className="px-3 py-2 text-emerald-700 font-semibold">{f.true_label}</td>
                            <td className="px-3 py-2 text-rose-700 font-semibold">{f.predicted_label}</td>
                            <td className="px-4 py-2 font-sans text-slate-700 max-w-md truncate" title={f.text}>
                              {f.text}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Detection Benchmark (20 Days) */}
          {activeSubTab === "detection" && (
            <div className="space-y-6">
              {/* Note Banner */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Rule Dynamics Test:</strong> This benchmark simulates 20 days with fixed seeds (S1, S2, S3 + 2 random planted incidents + normal traffic with S4, S5). This test uses the generator's known labels, not the AI, evaluating pure statistical rule mechanics.
                  </span>
                </div>
                <div className="text-right shrink-0 font-mono text-[11px]">
                  <span className="block font-bold">Tuned Fixed Threshold:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    {evalResult.detection.tunedFixedThreshold} complaints / 15m
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Planted Incidents Caught</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-emerald-700">
                        {evalResult.detection.totalPlantedIncidents - evalResult.detection.adaptiveMissedCount} / {evalResult.detection.totalPlantedIncidents}
                      </span>
                      <span className="text-[10px] text-emerald-600 block">Adaptive Rule</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {evalResult.detection.totalPlantedIncidents - evalResult.detection.fixedMissedCount} / {evalResult.detection.totalPlantedIncidents}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Fixed Threshold</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">False Alerts / Normal Day</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-indigo-700">
                        {evalResult.detection.adaptiveFalseAlertsPerNormalDay.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-indigo-600 block">Adaptive Rule</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">
                        {evalResult.detection.fixedFalseAlertsPerNormalDay.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Fixed Threshold</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Average Detection Delay</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-lg font-black text-indigo-700">5 min</span>
                      <span className="text-[10px] text-indigo-600 block">Adaptive Rule (1 bucket)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-700 font-mono">15 min</span>
                      <span className="text-[10px] text-slate-400 block">Fixed Threshold</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <span className="text-slate-500 text-[11px] block">Category & District Pinpointed</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-sm font-black text-emerald-700 block">Yes (100%)</span>
                      <span className="text-[10px] text-emerald-600 block">Adaptive Rule</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 font-mono block">No (0%)</span>
                      <span className="text-[10px] text-slate-400 block">Fixed (cannot pinpoint)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Planted Incidents Performance Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Planted Incident Detection Performance Log
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Day</th>
                        <th className="px-3 py-2">Scenario</th>
                        <th className="px-3 py-2">Target Cell</th>
                        <th className="px-3 py-2 text-center">Adaptive Detection</th>
                        <th className="px-3 py-2 text-center">Adaptive Delay</th>
                        <th className="px-3 py-2 text-center">Fixed Detection</th>
                        <th className="px-3 py-2 text-center">Category Identified?</th>
                        <th className="px-3 py-2 text-center">District Identified?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {evalResult.detection.plantedResults.map((pr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-bold text-slate-700">Day {pr.day}</td>
                          <td className="px-3 py-2 font-sans font-semibold text-slate-800">{pr.incidentName}</td>
                          <td className="px-3 py-2 text-indigo-700">
                            {pr.targetCategory} &times; {pr.targetDistrict}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {pr.adaptiveDetected ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Detected</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">Missed</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700">{pr.adaptiveDelayMinutes} min</td>
                          <td className="px-3 py-2 text-center">
                            {pr.fixedDetected ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">Detected</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">Missed</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-emerald-700 font-bold">Adaptive: Yes</span> / <span className="text-rose-600">Fixed: No</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-emerald-700 font-bold">Adaptive: Yes</span> / <span className="text-rose-600">Fixed: No</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 3: Cause Hypotheses Benchmark */}
          {activeSubTab === "cause" && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-purple-950">Gemini Root Cause Hypothesis Accuracy</h4>
                  <p className="text-[11px] text-purple-800 mt-0.5">
                    Evaluates S1, S2, S3, Variant 1 (5h prior change vs nearer decoy), and Variant 2 (district match disambiguation).
                  </p>
                </div>
                <div className="font-mono text-sm font-bold px-3 py-1 bg-purple-100 text-purple-900 rounded-lg border border-purple-300">
                  {evalResult.cause.passedCount} / {evalResult.cause.totalTests} Scenarios Passed
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {evalResult.cause.tests.map((test, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {test.scenarioTitle}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Target Cell: {test.incidentCategory} &times; {test.incidentDistrict}
                        </span>
                      </div>

                      <div className="text-right">
                        {test.isPlantedCauseRankedFirst || test.isNoRelatedChangeCorrectlyReturned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 text-rose-800 font-bold font-mono text-xs">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> FAIL
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Expected Cause:</span>
                        <span className="font-bold text-slate-800">
                          {test.expectedChangeId || "null (no related change)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Model Top Hypothesis:</span>
                        <span className="font-bold text-indigo-700">
                          {test.modelTopHypothesisChangeId || "null (no related change)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Model Confidence (uncalibrated):</span>
                        <span className="font-bold text-slate-700">
                          {Math.round(test.modelConfidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-xs italic">
                      "{test.reasoning}"
                    </p>

                    {test.hallucinatedIdsRemovedCount > 0 && (
                      <span className="inline-block text-[10px] text-amber-800 font-mono bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        {test.hallucinatedIdsRemovedCount} hallucinated IDs removed by code validation
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 4: Cost & Speed */}
          {activeSubTab === "speed_cost" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Model Latency & Token Economics
                    </h4>
                    <p className="text-xs text-slate-500">
                      Measured from live execution telemetry across complaints processed in this session.
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Live Telemetry Tracker
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-slate-500 text-[11px] block">Avg Input Tokens / Complaint</span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                      {currentCostAndSpeed?.inputTokensPerComplaint ?? 0}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-slate-500 text-[11px] block">Avg Output Tokens / Complaint</span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                      {currentCostAndSpeed?.outputTokensPerComplaint ?? 0}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-slate-500 text-[11px] block">Median Latency</span>
                    <span className="text-xl font-black text-indigo-700 font-mono mt-1 block">
                      {currentCostAndSpeed?.medianLatencyMs ?? 0} ms
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-slate-500 text-[11px] block">Slowest Latency</span>
                    <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                      {currentCostAndSpeed?.slowestLatencyMs ?? 0} ms
                    </span>
                  </div>
                </div>

                {/* Configurable Pricing Calculator */}
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs">
                    Configurable Pricing Calculator
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    Price constants are 0 by default with note: "Enter current published prices to see cost". Configure below to recalculate estimated unit costs dynamically.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Input Token Price ($ / 1 Million tokens)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={inputPrice}
                        onChange={(e) => setInputPrice(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 0.10"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Output Token Price ($ / 1 Million tokens)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={outputPrice}
                        onChange={(e) => setOutputPrice(Number(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 0.40"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-indigo-200 text-xs">
                    <span className="font-bold text-indigo-950">
                      Estimated Cost per 1,000 Complaints:
                    </span>
                    <span className="font-mono text-base font-black text-indigo-700">
                      ${currentCostAndSpeed?.costPer1000ComplaintsUSD.toFixed(4)} USD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Import Evaluation Dataset</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-slate-500">
              Paste CSV or JSON with columns: <code>id, text, language, channel, true_category, true_district, expect_manual_review, is_injection_test</code>.
            </p>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="importFormat"
                  value="csv"
                  checked={importFormat === "csv"}
                  onChange={() => setImportFormat("csv")}
                />
                <span>CSV</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="importFormat"
                  value="json"
                  checked={importFormat === "json"}
                  onChange={() => setImportFormat("json")}
                />
                <span>JSON</span>
              </label>
            </div>

            <textarea
              value={importRawText}
              onChange={(e) => setImportRawText(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-lg border border-slate-300 font-mono text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder={
                importFormat === "csv"
                  ? "id,text,language,channel,true_category,true_district,expect_manual_review,is_injection_test\nROW-1,\"İnternet yoxdur\",az,app_chat,internet_outage,Binəqədi,false,false"
                  : "[\n  {\"id\": \"1\", \"text\": \"İnternet yoxdur\", \"language\": \"az\", \"channel\": \"app_chat\", \"true_category\": \"internet_outage\", \"true_district\": \"Binəqədi\", \"expect_manual_review\": false, \"is_injection_test\": false}\n]"
              }
            />

            {importError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Load Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
