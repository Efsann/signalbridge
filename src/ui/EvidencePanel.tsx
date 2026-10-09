import React, { useMemo } from "react";
import { Incident, Alert, Complaint, ChangeEntry } from "../types";
import { TELECOM_CATEGORIES, CHANNEL_LABELS } from "../sectors/telecom";
import { EvidenceHighlighter } from "./EvidenceHighlighter";
import { RootCauseAnalysisResult } from "../ai/rootCause";
import { GLOBAL_BASELINES, makeKey } from "../sim/generator";
import {
  HelpCircle,
  BarChart2,
  Lock,
  Layers,
  History,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface EvidencePanelProps {
  incident: Incident;
  alert?: Alert;
  linkedComplaints: Complaint[];
  candidateChanges: ChangeEntry[];
  currentSimTime: number;
  hypothesesResult?: RootCauseAnalysisResult | null;
  onGenerateHypotheses?: () => void;
  isGeneratingHypotheses?: boolean;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  incident,
  alert,
  linkedComplaints,
  candidateChanges,
  currentSimTime,
  hypothesesResult,
  onGenerateHypotheses,
  isGeneratingHypotheses,
}) => {
  const categoryMeta = TELECOM_CATEGORIES[incident.category];
  const baselineKey = makeKey(incident.category, incident.district);
  const baseline = GLOBAL_BASELINES.get(baselineKey) || {
    mean: alert?.baselineMean ?? 1.2,
    std: alert?.baselineStd ?? 1.0,
  };

  const currentCount = incident.complaintIds.length;
  const zScore = alert?.zScore ?? (currentCount - baseline.mean) / Math.max(1, baseline.std);
  const ruleThreshold = alert?.ruleThreshold ?? Math.max(8, baseline.mean + 3 * baseline.std);

  // Representative complaint cards (up to 8, earliest + highest severity)
  const representativeComplaints = useMemo(() => {
    return [...linkedComplaints]
      .sort((a, b) => {
        const sevA = a.analysis?.severity || 1;
        const sevB = b.analysis?.severity || 1;
        if (sevB !== sevA) return sevB - sevA; // highest severity first
        return a.ts - b.ts; // earliest first
      })
      .slice(0, 8);
  }, [linkedComplaints]);

  // Compute 5-minute bucket bar chart data for the last 2 simulated hours
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const startTime = currentSimTime - twoHoursMs;
  const bucketDurationMs = 5 * 60 * 1000; // 5 min
  const buckets: Array<{ timeStr: string; count: number; t: number }> = [];

  for (let t = startTime; t <= currentSimTime; t += bucketDurationMs) {
    const bEnd = t + bucketDurationMs;
    const countInBucket = linkedComplaints.filter(
      (c) => c.ts >= t && c.ts < bEnd
    ).length;
    const d = new Date(t);
    const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    buckets.push({ timeStr, count: countInBucket, t });
  }

  const maxBucketCount = Math.max(4, ...buckets.map((b) => b.count));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-6 text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Why Was This Flagged? (Evidence Dossier)
            </h3>
            <p className="text-[11px] text-slate-500">
              Run-time statistical evaluation, complaint evidence, and candidate change logs
            </p>
          </div>
        </div>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          Key: {incident.category} &times; {incident.district}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            Observed 15m Count
          </span>
          <span className="text-base font-bold font-mono text-slate-900">
            {currentCount} complaints
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Sliding window total
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            Baseline Mean &plusmn; Std
          </span>
          <span className="text-base font-bold font-mono text-slate-900">
            {baseline.mean.toFixed(2)} &plusmn; {baseline.std.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            14-day normal history
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            Statistical Z-Score
          </span>
          <span className="text-base font-bold font-mono text-amber-600">
            {zScore.toFixed(2)} &sigma;
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            (Count - Mean) / Std
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
            Rule That Fired
          </span>
          <span className="text-xs font-bold font-mono text-indigo-700 block mt-0.5">
            Count &ge; max(8, Mean+3&sigma;)
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Threshold: {ruleThreshold.toFixed(1)}
          </span>
        </div>
      </div>

      {/* 5-minute bucket bar chart of the last 2 simulated hours with baseline band */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-xs">
              5-Minute Complaint Arrival Buckets (Last 2 Hours)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block" /> Baseline mean ({baseline.mean.toFixed(1)})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> Alert threshold ({ruleThreshold.toFixed(1)})
            </span>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="h-28 flex items-end gap-1 pt-3 pb-1 border-b border-slate-200">
          {buckets.map((b, idx) => {
            const heightPercent = Math.min(100, Math.round((b.count / maxBucketCount) * 100));
            const isSpike = b.count > baseline.mean + baseline.std;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip */}
                <div className="absolute -top-7 hidden group-hover:flex px-1.5 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono whitespace-nowrap z-10">
                  {b.timeStr}: {b.count} complaints
                </div>

                <div
                  className={`w-full rounded-t transition-all ${
                    isSpike
                      ? "bg-rose-500 group-hover:bg-rose-600"
                      : "bg-indigo-300 group-hover:bg-indigo-400"
                  }`}
                  style={{ height: `${Math.max(4, heightPercent)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
          <span>{buckets[0]?.timeStr}</span>
          <span>Time (5m bins)</span>
          <span>{buckets[buckets.length - 1]?.timeStr}</span>
        </div>
      </div>

      {/* Representative Complaints (up to 8, earliest + highest severity) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Representative Complaints ({representativeComplaints.length} of {linkedComplaints.length})
          </h4>
          <span className="text-[10px] text-slate-400 italic">
            Ranked by highest severity and earliest arrival
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {representativeComplaints.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-[11px] shadow-2xs"
            >
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-700">{c.id}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(c.ts).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                    {CHANNEL_LABELS[c.channel]}
                  </span>
                  {c.hasMaskedData && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <Lock className="w-2.5 h-2.5" /> masked
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Source Badge */}
                  {c.source === "live_ai" && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      live_ai
                    </span>
                  )}
                  {c.source === "cached_ai" && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                      cached_ai
                    </span>
                  )}
                  {c.source === "offline_fixture" && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">
                      offline_fixture
                    </span>
                  )}

                  {c.analysis && (
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      Sev {c.analysis.severity} &middot; Conf: {Math.round(c.analysis.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Masked text with highlighted evidence phrases in amber */}
              <div className="mt-1">
                <EvidenceHighlighter
                  text={c.maskedText}
                  evidencePhrases={c.analysis?.evidence_phrases || []}
                />
              </div>

              {c.analysis?.summary && (
                <p className="mt-1.5 text-[11px] text-slate-500 italic border-t border-slate-100 pt-1">
                  Summary: "{c.analysis.summary}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Change Log Entries Considered (Matching ones highlighted) */}
      <div>
        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-slate-500" />
          Candidate Change-Log Entries (6 Hours Prior to First Complaint)
        </h4>

        {candidateChanges.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-200">
            No maintenance or network changes recorded in the 6 hours prior to the first complaint.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {candidateChanges.map((ch) => {
              const isScopeMatch = ch.scope.toLowerCase() === incident.district.toLowerCase();

              return (
                <div
                  key={ch.id}
                  className={`p-3 flex items-start justify-between gap-3 text-[11px] transition-colors ${
                    isScopeMatch ? "bg-amber-50/70 border-l-4 border-l-amber-500" : ""
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700">{ch.id}</span>
                      <span className="text-slate-900 font-semibold">{ch.description}</span>
                      {isScopeMatch && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                          Scope matches district
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Change Time: {new Date(ch.ts).toLocaleTimeString()} &middot; Scope: <strong>{ch.scope}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                    {ch.scope}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* "Hypotheses, not confirmed facts" Section */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Hypotheses, not confirmed facts
            </h4>
            <p className="text-[11px] text-slate-500">
              AI correlation of capped summaries against change-log entries
            </p>
          </div>

          {onGenerateHypotheses && (
            <button
              onClick={onGenerateHypotheses}
              disabled={isGeneratingHypotheses}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
            >
              {isGeneratingHypotheses ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Correlating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Hypotheses</span>
                </>
              )}
            </button>
          )}
        </div>

        {hypothesesResult ? (
          <div className="space-y-3">
            {hypothesesResult.droppedCount > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Validation Rule:</strong> {hypothesesResult.droppedCount} hypotheses removed by validation (invalid ID or occurred after incident start).
                </span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                Model Overall Note
              </span>
              <p className="text-slate-800 italic">"{hypothesesResult.overall_note}"</p>
            </div>

            <div className="space-y-2">
              {hypothesesResult.hypotheses.map((h, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Hypothesis #{idx + 1}:{" "}
                      {h.change_id ? (
                        <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          Change {h.change_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No related change found</span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Model confidence (uncalibrated): {Math.round(h.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-slate-700">{h.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
            Hypotheses not generated yet. Click "Generate Hypotheses" to analyze potential causes against candidate change logs.
          </div>
        )}
      </div>
    </div>
  );
};
