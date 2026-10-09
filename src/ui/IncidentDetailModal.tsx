import React, { useState } from "react";
import { Incident, Complaint, Alert, ChangeEntry, IncidentStatus } from "../types";
import { EvidencePanel } from "./EvidencePanel";
import {
  generateRootCauseHypotheses,
  RootCauseAnalysisResult,
} from "../ai/rootCause";
import { getCandidateChangesBefore } from "../sim/fixtures";
import {
  getAllowedNextStatuses,
  transitionIncidentStatus,
  assignIncidentOwner,
} from "../engine/incidents";
import {
  applyFixAndStartMonitoring,
  computeMonitoringSparkline,
  evaluateMonitoring,
} from "../engine/monitoring";
import { GLOBAL_BASELINES, makeKey } from "../sim/generator";
import { renderPriorityBadge } from "./IncidentFeed";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  User,
  Wrench,
  Clock,
  ArrowRight,
  ShieldAlert,
  Activity,
  Layers,
  RefreshCw,
  Info,
} from "lucide-react";

interface IncidentDetailModalProps {
  incident: Incident;
  alert?: Alert;
  complaintsMap: Map<string, Complaint>;
  currentSimTime: number;
  onUpdateIncident: (updated: Incident) => void;
  onApplyFix: (incident: Incident) => void;
  onClose: () => void;
}

const STEPPER_STAGES: IncidentStatus[] = [
  "New",
  "Assigned",
  "Investigating",
  "Action Taken",
  "Monitoring",
  "Resolved",
];

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  alert,
  complaintsMap,
  currentSimTime,
  onUpdateIncident,
  onApplyFix,
  onClose,
}) => {
  const [ownerInput, setOwnerInput] = useState(incident.owner || "");
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "hypotheses">("overview");
  const [isGeneratingHypotheses, setIsGeneratingHypotheses] = useState(false);
  const [hypothesesResult, setHypothesesResult] = useState<RootCauseAnalysisResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Linked complaints objects
  const linkedComplaints = incident.complaintIds
    .map((id) => complaintsMap.get(id))
    .filter((c): c is Complaint => !!c);

  // Candidate change logs within 6 hours before first complaint
  const candidateChanges = getCandidateChangesBefore(incident.firstComplaintAt);

  // Allowed next transitions from state machine
  const allowedNext = getAllowedNextStatuses(incident.status);

  // Generate Cause Hypotheses
  const handleGenerateHypotheses = async () => {
    setIsGeneratingHypotheses(true);
    setStatusError(null);
    try {
      const res = await generateRootCauseHypotheses(
        incident,
        linkedComplaints,
        candidateChanges
      );
      setHypothesesResult(res);
    } catch (err: any) {
      setStatusError(`Error generating hypotheses: ${err.message}`);
    } finally {
      setIsGeneratingHypotheses(false);
    }
  };

  const handleAdvanceStatus = (target: IncidentStatus) => {
    setStatusError(null);
    const res = transitionIncidentStatus(
      incident,
      target,
      "analyst",
      `Operator advanced workflow to ${target}`,
      currentSimTime
    );
    if (res.success) {
      onUpdateIncident(res.incident);
    } else {
      setStatusError(res.error || "Transition failed");
    }
  };

  const handleSaveOwner = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = assignIncidentOwner(incident, ownerInput, "analyst", currentSimTime);
    onUpdateIncident(updated);
  };

  const handleTriggerFix = () => {
    onApplyFix(incident);
  };

  // Sparkline data for post-fix monitoring
  const fixTs =
    incident.fixAppliedAt ||
    (incident.status === "Monitoring" || incident.status === "Resolved"
      ? incident.createdAt + 10 * 60 * 1000
      : null);

  const sparklineData = computeMonitoringSparkline(
    linkedComplaints,
    fixTs,
    currentSimTime
  );

  // Post-fix monitoring evaluation
  const categoryBase = GLOBAL_BASELINES.get(makeKey(incident.category, incident.district)) || {
    mean: alert?.baselineMean ?? 1.2,
    std: alert?.baselineStd ?? 1.0,
  };
  const current15mCount = linkedComplaints.filter(
    (c) => c.ts >= currentSimTime - 15 * 60 * 1000 && c.ts <= currentSimTime
  ).length;
  const alertThresh = Math.max(8, categoryBase.mean + 3 * categoryBase.std);
  const monitoringEval =
    incident.status === "Monitoring"
      ? evaluateMonitoring(
          incident,
          current15mCount,
          categoryBase.mean,
          categoryBase.std,
          alertThresh,
          currentSimTime,
          incident.monitoringBelowSince ?? incident.fixAppliedAt ?? null
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono font-bold text-xs text-slate-500">
                {incident.id}
              </span>
              {renderPriorityBadge(incident.priority)}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                {incident.status}
              </span>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {incident.department}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">{incident.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Machine Status Stepper */}
        <div className="px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[550px] gap-2">
            {incident.status === "Reopened" ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-600 text-rose-300 text-xs font-bold w-full justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Status: REOPENED (Complaints surged or new episode triggered)
                </span>
                <span className="text-[11px] font-mono text-rose-200">
                  Allowed next step: &rarr; Investigating
                </span>
              </div>
            ) : (
              STEPPER_STAGES.map((step, idx) => {
                const isCurrent = incident.status === step;
                const isPast =
                  STEPPER_STAGES.indexOf(incident.status) > idx &&
                  incident.status !== "Reopened";

                return (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400"
                          : isPast
                          ? "bg-slate-800 text-emerald-400"
                          : "bg-slate-800/60 text-slate-400"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center bg-black/30">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                    {idx < STEPPER_STAGES.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Bar: Free-text Owner & Allowed Next Transitions */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Owner Assignment Field */}
          <form onSubmit={handleSaveOwner} className="flex items-center gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Assigned Owner:
            </span>
            <input
              type="text"
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              placeholder="e.g. NOC Lead / T. Mammadov"
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-44"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-semibold text-slate-700 transition-colors"
            >
              Save Owner
            </button>
          </form>

          {/* Allowed Next Steps */}
          <div className="flex items-center gap-2">
            {allowedNext.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => handleAdvanceStatus(nextStatus)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-xs"
              >
                <span>Advance to: {nextStatus}</span>
              </button>
            ))}

            {/* Stage 3 Fix Button */}
            {(incident.status === "Investigating" ||
              incident.status === "Action Taken") && (
              <button
                onClick={handleTriggerFix}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-xs"
                title="Makes the generator reduce complaints for this key and moves incident to Monitoring"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Apply fix (demo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Workflow Error Banner */}
        {statusError && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{statusError}</span>
            <button
              onClick={() => setStatusError(null)}
              className="text-rose-600 font-bold ml-2 hover:text-rose-800"
            >
              &times;
            </button>
          </div>
        )}

        {/* View Tabs */}
        <div className="px-6 pt-3 flex gap-4 border-b border-slate-200 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview & Activity
          </button>
          <button
            onClick={() => setActiveTab("evidence")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "evidence"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Evidence Panel ("Why was this flagged?")
          </button>
          <button
            onClick={() => setActiveTab("hypotheses")}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "hypotheses"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Hypotheses, not confirmed facts
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Monitoring Sparkline if in Monitoring or Resolved */}
              {(incident.status === "Monitoring" || incident.status === "Resolved") && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Post-Fix Monitoring Recovery Trend (2-Hour Window)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Target: &le; mean+std for 30 simulated minutes (Current: {monitoringEval ? `${monitoringEval.minutesBelowThreshold}m below threshold` : "Monitoring"})
                      </span>
                    </div>

                    {incident.fixAppliedAt && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        Fix Deployed at {new Date(incident.fixAppliedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Sparkline Bar Chart with Vertical Line for Fix */}
                  <div className="h-20 flex items-end gap-1 pt-3 pb-1 border-b border-indigo-200 relative">
                    {sparklineData.points.map((pt, idx) => {
                      const h = Math.min(100, Math.max(6, pt.count * 15));
                      const isFirstAfterFix = pt.isAfterFix && (idx === 0 || !sparklineData.points[idx - 1].isAfterFix);

                      return (
                        <React.Fragment key={idx}>
                          {isFirstAfterFix && (
                            <div className="h-full flex flex-col items-center justify-start z-10 mx-0.5">
                              <span className="text-[9px] font-bold font-mono px-1 rounded bg-slate-900 text-white whitespace-nowrap shadow-xs -mt-3">
                                Fix Applied
                              </span>
                              <div className="w-0.5 flex-1 bg-emerald-600 border-l border-dashed border-emerald-700" />
                            </div>
                          )}
                          <div
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            <div className="absolute -top-6 hidden group-hover:flex px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-mono whitespace-nowrap z-20">
                              {pt.timeStr}: {pt.count}
                            </div>
                            <div
                              className={`w-full rounded-t transition-all ${
                                pt.isAfterFix ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-400 hover:bg-rose-500"
                              }`}
                              style={{ height: `${h}%` }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-rose-400 inline-block" /> Before fix (elevated outage rate)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Post-fix monitoring &darr;
                    </span>
                  </div>

                  {/* Auto-suggested Resolution Prompt */}
                  {monitoringEval?.canAutoResolve && incident.status === "Monitoring" && (
                    <div className="p-3 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <div>
                          <span className="font-bold text-xs block">
                            Auto-Resolution Suggested (30m Below Normal Threshold)
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            15-minute complaints have stayed at baseline for {monitoringEval.minutesBelowThreshold} minutes.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdvanceStatus("Resolved")}
                        className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
                      >
                        Resolve Incident &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Log Audit Trail */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Incident State Machine Activity Log
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1">
                  {incident.activityLog.map((act, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{act.action}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(act.ts).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-slate-600">
                          by {act.actor}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{act.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "evidence" && (
            <EvidencePanel
              incident={incident}
              alert={alert}
              linkedComplaints={linkedComplaints}
              candidateChanges={candidateChanges}
              currentSimTime={currentSimTime}
              hypothesesResult={hypothesesResult}
              onGenerateHypotheses={handleGenerateHypotheses}
              isGeneratingHypotheses={isGeneratingHypotheses}
            />
          )}

          {activeTab === "hypotheses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Hypotheses, not confirmed facts
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gemini analyzes capped complaint summaries against 6-hour prior change logs.
                  </p>
                </div>

                <button
                  onClick={handleGenerateHypotheses}
                  disabled={isGeneratingHypotheses}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isGeneratingHypotheses ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Correlating with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Cause Hypotheses</span>
                    </>
                  )}
                </button>
              </div>

              {hypothesesResult && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* Validation notice if any were dropped */}
                  {hypothesesResult.droppedCount > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Code Validation Rule:</strong> {hypothesesResult.droppedCount}{" "}
                        hypotheses removed by validation (referenced nonexistent change ID or took place after first complaint).
                      </span>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                      Analyst Operational Note
                    </span>
                    <p className="text-slate-800 italic">"{hypothesesResult.overall_note}"</p>
                  </div>

                  <div className="space-y-2.5">
                    {hypothesesResult.hypotheses.map((h, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              Hypothesis #{idx + 1}:
                            </span>
                            {h.change_id ? (
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-xs">
                                Change {h.change_id}
                              </span>
                            ) : (
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                No Related Change Found (null)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            Model confidence (uncalibrated): {Math.round(h.confidence * 100)}%
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 mt-1 font-sans">
                          {h.reasoning}
                        </p>

                        {h.matchedChange && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                            <span>
                              Description: <strong>{h.matchedChange.description}</strong>
                            </span>
                            <span className="font-mono">Scope: {h.matchedChange.scope}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
