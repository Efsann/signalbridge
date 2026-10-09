/**
 * SignalBridge - Stage 4: Evaluation, Benchmarks & Operational Foundation
 * Fictional Telecom Operator "DemoTel" in Baku, Azerbaijan
 */

import React, { useState, useMemo } from "react";
import { Complaint, Incident, Alert } from "./types";
import { Header } from "./ui/Header";
import { SubmitForm } from "./ui/SubmitForm";
import { ComplaintList } from "./ui/ComplaintList";
import { LiveBoard, AIMode } from "./ui/LiveBoard";
import { DepartmentView } from "./ui/DepartmentView";
import { IncidentDetailModal } from "./ui/IncidentDetailModal";
import { TestRunnerModal } from "./ui/TestRunnerModal";
import { EvaluationTab } from "./ui/EvaluationTab";
import { DataDisclosureTab } from "./ui/DataDisclosureTab";
import { DemoGuidePanel } from "./ui/DemoGuidePanel";
import { SIM_START_TIME } from "./config";
import { applyFixAndStartMonitoring } from "./engine/monitoring";
import {
  makeKey,
  SCENARIOS,
  generateScenarioComplaints,
  generateSimilarComplaints,
} from "./sim/generator";
import {
  SendHorizontal,
  Layers,
  Activity,
  Building2,
  BarChart2,
  BookOpen,
  Download,
  ShieldAlert,
} from "lucide-react";

export default function App() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<
    "live_board" | "departments" | "evaluation" | "disclosure" | "intake" | "ledger"
  >("live_board");
  const [aiMode, setAiMode] = useState<AIMode>("live_ai");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [prefilledComplaintText, setPrefilledComplaintText] = useState("");
  const [simulateError, setSimulateError] = useState(false);

  // Lifted Simulation Clock State
  const [simTime, setSimTime] = useState<number>(SIM_START_TIME);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 10 | 30>(1);

  // Lifted Incidents & Alerts State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Complaints Map for fast lookup
  const complaintsMap = useMemo(() => {
    const map = new Map<string, Complaint>();
    complaints.forEach((c) => map.set(c.id, c));
    return map;
  }, [complaints]);

  const handleComplaintProcessed = (newComplaint: Complaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
  };

  const handleInjectBatch = (batch: Complaint[]) => {
    setComplaints((prev) => [...batch, ...prev]);
    if (aiMode !== "offline_fixture") {
      setPendingCount((c) => c + batch.length);
    }
  };

  const handleUpdateIncident = (updated: Incident) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i))
    );
    if (selectedIncident?.id === updated.id) {
      setSelectedIncident(updated);
    }
  };

  const handleApplyFix = (incident: Incident) => {
    const updated = applyFixAndStartMonitoring(incident, simTime);
    handleUpdateIncident(updated);
    const key = makeKey(incident.category, incident.district);

    // Drop upcoming scenario spike complaints for that key so volume drops to normal rate
    setComplaints((prev) => {
      return prev.filter((c) => {
        if (!c.analysis) return true;
        const cKey = makeKey(c.analysis.category, c.analysis.district);
        return !(cKey === key && c.ts > simTime);
      });
    });
  };

  // Demo Guide 7 Numbered Steps Actions
  const handleStep1SubmitAZ = () => {
    setPrefilledComplaintText(
      "Salam, Binəqədi rayonunda, Biləcəri qəsəbəsində səhərdən bəri optik internet tamamilə kəsilib. Modemdə qırmızı LOS işığı yanır, heç bir sayt açılmır."
    );
    setActiveTab("intake");
  };

  const handleStep2InjectSimilar = () => {
    const batch = generateSimilarComplaints("internet_outage", "Binəqədi", simTime);
    const prepared = batch.map((c) => ({
      ...c,
      source: aiMode === "offline_fixture" ? ("offline_fixture" as const) : ("pending_ai" as const),
    }));
    handleInjectBatch(prepared);
    setActiveTab("live_board");
  };

  const handleStep3RunS1x30 = () => {
    setActiveTab("live_board");
    setSpeedMultiplier(30);
    const newBatch = generateScenarioComplaints(SCENARIOS.S1, simTime, Date.now());
    const preparedBatch = newBatch.map((c) => ({
      ...c,
      source: aiMode === "offline_fixture" ? ("offline_fixture" as const) : ("pending_ai" as const),
    }));
    setComplaints((prev) => [...preparedBatch, ...prev].sort((a, b) => b.ts - a.ts));
    if (aiMode !== "offline_fixture") {
      setPendingCount((cnt) => cnt + preparedBatch.length);
    }
    setIsRunning(true);
  };

  const handleStep4OpenIncidentEvidence = () => {
    // If there is an incident, open it, otherwise pick the first or create demo
    const target = incidents.find((i) => i.status !== "Resolved") || incidents[0];
    if (target) {
      setSelectedIncident(target);
    } else {
      // Run S1 briefly to generate one
      handleStep3RunS1x30();
    }
  };

  const handleStep5DepartmentAccept = () => {
    setActiveTab("departments");
  };

  const handleStep6ApplyFixMonitoring = () => {
    const target =
      incidents.find((i) => i.status === "Action Taken" || i.status === "Investigating" || i.status === "Assigned") ||
      incidents[0];
    if (target) {
      handleApplyFix(target);
      setSelectedIncident(target);
    }
  };

  const handleStep7OpenEvaluation = () => {
    setActiveTab("evaluation");
  };

  const handleResetDemo = () => {
    // Preserves localStorage AI cache
    setSimTime(SIM_START_TIME);
    setIsRunning(false);
    setAlerts([]);
    setIncidents([]);
    setComplaints([]);
    setPendingCount(0);
    setSelectedIncident(null);
  };

  const handleReplayLastScenario = () => {
    // Reset and replay S1 deterministically from cache
    setSimTime(SIM_START_TIME);
    setAlerts([]);
    setIncidents([]);
    setSelectedIncident(null);
    setSpeedMultiplier(10);
    const newBatch = generateScenarioComplaints(SCENARIOS.S1, SIM_START_TIME, 42); // deterministic seed
    setComplaints(newBatch.sort((a, b) => b.ts - a.ts));
    setIsRunning(true);
    setActiveTab("live_board");
  };

  const activeIncidentCount = incidents.filter((i) => i.status !== "Resolved").length;
  const aiRoutedCount = complaints.filter(
    (complaint) =>
      complaint.department && complaint.department !== "Manual Review"
  ).length;
  const manualReviewCount = complaints.filter(
    (complaint) => complaint.department === "Manual Review"
  ).length;

  const handleExportAuditLog = () => {
    const auditLog = new Blob([JSON.stringify(complaints, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(auditLog);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `signalbridge-audit-log-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header with Live AI Telemetry & AI Mode Selector */}
      <Header
        onOpenTestModal={() => setIsTestModalOpen(true)}
        aiMode={aiMode}
        onSelectAIMode={setAiMode}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Operational KPIs and circuit-breaker controls */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3" aria-label="Operational dashboard">
          <div className="rounded-xl bg-slate-900 text-white border border-slate-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Signals</p>
            <p className="mt-2 text-2xl font-bold font-mono">{complaints.length}</p>
          </div>
          <div className="rounded-xl bg-slate-900 text-white border border-slate-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Routed</p>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">{aiRoutedCount}</p>
          </div>
          <div className="rounded-xl bg-slate-900 text-white border border-slate-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Manual Review</p>
            <p className="mt-2 text-2xl font-bold font-mono text-amber-400">{manualReviewCount}</p>
          </div>
          <button
            type="button"
            aria-pressed={simulateError}
            onClick={() => setSimulateError((enabled) => !enabled)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              simulateError
                ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                : "bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{simulateError ? "Circuit Breaker: ON" : "Circuit Breaker: OFF"}</span>
          </button>
          <button
            type="button"
            onClick={handleExportAuditLog}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit Log (.JSON)</span>
          </button>
        </section>

        {/* Numbered Demo Guide Panel */}
        <DemoGuidePanel
          onStep1SubmitAZ={handleStep1SubmitAZ}
          onStep2InjectSimilar={handleStep2InjectSimilar}
          onStep3RunS1x30={handleStep3RunS1x30}
          onStep4OpenIncidentEvidence={handleStep4OpenIncidentEvidence}
          onStep5DepartmentAccept={handleStep5DepartmentAccept}
          onStep6ApplyFixMonitoring={handleStep6ApplyFixMonitoring}
          onStep7OpenEvaluation={handleStep7OpenEvaluation}
          onResetDemo={handleResetDemo}
          onReplayLastScenario={handleReplayLastScenario}
          hasActiveIncidents={activeIncidentCount > 0}
          selectedIncident={selectedIncident}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <nav className="flex space-x-1.5 flex-wrap gap-y-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("live_board")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "live_board"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Live Operational Board</span>
              {activeIncidentCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold font-mono">
                  {activeIncidentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("departments")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "departments"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Department Workbench</span>
              {incidents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                  {incidents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("evaluation")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "evaluation"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              <span>Evaluation & Benchmarks</span>
            </button>

            <button
              onClick={() => setActiveTab("disclosure")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "disclosure"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Data & Disclosure</span>
            </button>

            <button
              onClick={() => setActiveTab("intake")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "intake"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <SendHorizontal className="w-4 h-4" />
              <span>Submit Complaint</span>
            </button>

            <button
              onClick={() => setActiveTab("ledger")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "ledger"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Complaints Ledger</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                {complaints.length}
              </span>
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>NOC Surveillance Active</span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === "live_board" && (
          <LiveBoard
            complaints={complaints}
            setComplaints={setComplaints}
            aiMode={aiMode}
            pendingCount={pendingCount}
            setPendingCount={setPendingCount}
            incidents={incidents}
            setIncidents={setIncidents}
            alerts={alerts}
            setAlerts={setAlerts}
            simTime={simTime}
            setSimTime={setSimTime}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            speedMultiplier={speedMultiplier}
            setSpeedMultiplier={setSpeedMultiplier}
            selectedIncident={selectedIncident}
            setSelectedIncident={setSelectedIncident}
            onApplyFix={handleApplyFix}
          />
        )}

        {activeTab === "departments" && (
          <DepartmentView
            incidents={incidents}
            complaintsMap={complaintsMap}
            currentSimTime={simTime}
            onUpdateIncident={handleUpdateIncident}
            onInspectIncident={(inc) => setSelectedIncident(inc)}
            onApplyFix={handleApplyFix}
          />
        )}

        {activeTab === "evaluation" && <EvaluationTab />}

        {activeTab === "disclosure" && <DataDisclosureTab />}

        {activeTab === "intake" && (
          <div className="space-y-6">
            <SubmitForm
              onComplaintProcessed={handleComplaintProcessed}
              onInjectBatch={handleInjectBatch}
              initialText={prefilledComplaintText}
              simulateError={simulateError}
            />
            {complaints.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recent In-Memory Submissions ({complaints.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab("ledger")}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View All in Ledger &rarr;
                  </button>
                </div>
                <ComplaintList complaints={complaints.slice(0, 3)} />
              </div>
            )}
          </div>
        )}

        {activeTab === "ledger" && (
          <ComplaintList complaints={complaints} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SignalBridge &middot; Fictional Operator DemoTel (Baku, Azerbaijan)</span>
          <span className="font-mono text-[11px] text-slate-400">
            Statistical Anomaly Detection &middot; Side-by-Side AI vs Baseline &middot; 20-Day Fixed Seed Simulation &middot; Gemini Cause Hypotheses
          </span>
        </div>
      </footer>

      {/* Incident Detail Modal (accessible globally across views) */}
      {selectedIncident && activeTab !== "live_board" && (
        <IncidentDetailModal
          incident={selectedIncident}
          alert={alerts.find((a) => a.id === selectedIncident.alertId)}
          complaintsMap={complaintsMap}
          currentSimTime={simTime}
          onUpdateIncident={handleUpdateIncident}
          onApplyFix={handleApplyFix}
          onClose={() => setSelectedIncident(null)}
        />
      )}

      {/* Verification Unit Test Modal */}
      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}
