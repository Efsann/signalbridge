import React, { useEffect, useState } from "react";
import {
  GeminiTelemetry,
  getTelemetry,
  subscribeTelemetry,
  resetTelemetry,
  clearGeminiCache,
  computeTelemetryStats,
} from "../ai/gemini";
import {
  OPERATOR_NAME,
  OPERATOR_LOCATION,
  GEMINI_MODEL,
  PROMPT_VERSION,
  PRICING_NOTE,
} from "../config";
import {
  Activity,
  Zap,
  Gauge,
  Timer,
  DollarSign,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Radio,
  Cpu,
  Database,
  FileText,
  AlertCircle,
} from "lucide-react";
import { runSignalBridgeUnitTests } from "../test/suite";
import { AIMode } from "./LiveBoard";

interface HeaderProps {
  onOpenTestModal: () => void;
  aiMode: AIMode;
  onSelectAIMode: (mode: AIMode) => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTestModal,
  aiMode,
  onSelectAIMode,
  pendingCount,
}) => {
  const [telemetry, setTelemetry] = useState<GeminiTelemetry>(getTelemetry);
  const [testStats] = useState(() => {
    const tests = runSignalBridgeUnitTests();
    return {
      passed: tests.filter((t) => t.passed).length,
      total: tests.length,
    };
  });

  useEffect(() => {
    const unsubscribe = subscribeTelemetry((t) => {
      setTelemetry(t);
    });
    return unsubscribe;
  }, []);

  const stats = computeTelemetryStats(telemetry);

  const handleResetMetrics = () => {
    if (confirm("Reset current Gemini runtime metrics? (Complaints in memory will remain)")) {
      resetTelemetry();
    }
  };

  const handleClearCache = () => {
    if (confirm("Clear AI classification localStorage cache?")) {
      clearGeminiCache();
      alert("AI response cache cleared successfully.");
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      {/* Brand & Subtitle Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                SignalBridge
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                Stage 2 Detection & Live Board
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Complaint Triage Engine &middot; <strong className="text-slate-200">{OPERATOR_NAME}</strong> ({OPERATOR_LOCATION})
            </p>
          </div>
        </div>

        {/* AI Modes Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-[10px] text-slate-400 font-semibold px-1.5 uppercase">AI Mode:</span>

          <button
            type="button"
            onClick={() => onSelectAIMode("live_ai")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
              aiMode === "live_ai"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Classify arriving complaints live with Gemini"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Live AI</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAIMode("cached_ai")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
              aiMode === "cached_ai"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Read from precomputed localStorage cache"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cached AI</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectAIMode("offline_fixture")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
              aiMode === "offline_fixture"
                ? "bg-red-700 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Uses generator known labels with red badge. Only for when the API is unavailable."
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Offline Fixtures</span>
          </button>
        </div>

        {/* System & Model Badges */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950 border border-amber-700 text-xs text-amber-300 font-mono font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Pending AI: {pendingCount}</span>
            </div>
          )}

          {aiMode === "offline_fixture" && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-950 border border-red-700 text-[11px] text-red-300 font-semibold" title="Only for when the API is unavailable">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Offline fixture labels, no AI used</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">Model:</span>
            <span className="font-semibold text-slate-200">{GEMINI_MODEL}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Prompt:</span>
            <span className="text-slate-200">{PROMPT_VERSION}</span>
          </div>

          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-700/60 hover:bg-emerald-900/60 transition-colors text-xs text-emerald-300 font-medium"
            title="View PII Masking and Routing unit test suite"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Tests: {testStats.passed}/{testStats.total}
            </span>
          </button>

          <button
            onClick={handleClearCache}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-colors"
            title="Clear AI LocalStorage Cache"
          >
            <Trash2 className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Cache</span>
          </button>

          <button
            onClick={handleResetMetrics}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-colors"
            title="Reset Telemetry Metrics"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Real-Time AI Usage Telemetry Ribbon */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium shrink-0">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Telemetry (Runtime):</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
            {/* Live Calls */}
            <div className="flex items-center gap-1.5" title="Live Gemini API calls executed">
              <span className="text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" /> Calls:
              </span>
              <span className={`font-mono font-semibold ${telemetry.liveCalls > 0 ? "text-cyan-300" : "text-slate-500 italic"}`}>
                {stats.liveCallsText}
              </span>
              {telemetry.cachedHits > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  (+{telemetry.cachedHits} cached)
                </span>
              )}
            </div>

            {/* Tokens */}
            <div className="flex items-center gap-1.5" title="Total tokens consumed (Prompt + Output)">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Tokens:
              </span>
              <span className={`font-mono font-semibold ${telemetry.totalTokens > 0 ? "text-amber-300" : "text-slate-500 italic"}`}>
                {stats.totalTokensText}
              </span>
              {telemetry.totalTokens > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  ({stats.promptTokensText} in / {stats.candidatesTokensText} out)
                </span>
              )}
            </div>

            {/* Median Latency */}
            <div className="flex items-center gap-1.5" title="Median API turnaround latency">
              <span className="text-slate-400 flex items-center gap-1">
                <Timer className="w-3 h-3 text-emerald-400" /> Median:
              </span>
              <span className={`font-mono font-semibold ${telemetry.latencies.length > 0 ? "text-emerald-300" : "text-slate-500 italic"}`}>
                {stats.medianLatencyText}
              </span>
            </div>

            {/* Slowest Latency */}
            <div className="flex items-center gap-1.5" title="Slowest API turnaround latency">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-rose-400" /> Slowest:
              </span>
              <span className={`font-mono font-semibold ${telemetry.latencies.length > 0 ? "text-rose-300" : "text-slate-500 italic"}`}>
                {stats.slowestLatencyText}
              </span>
            </div>

            {/* Cost */}
            <div
              className="flex items-center gap-1.5 cursor-help"
              title={PRICING_NOTE}
            >
              <span className="text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-purple-400" /> Cost:
              </span>
              <span className="font-mono font-semibold text-purple-300">
                {stats.estimatedCost}
              </span>
              <span className="text-[10px] text-slate-500 border-b border-dashed border-slate-600">
                (rates: $0)
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
