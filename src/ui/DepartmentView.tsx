import React, { useState, useMemo } from "react";
import { Department, Incident, Complaint, Alert, IncidentStatus } from "../types";
import {
  getAllowedNextStatuses,
  transitionIncidentStatus,
  assignIncidentOwner,
} from "../engine/incidents";
import { renderPriorityBadge } from "./IncidentFeed";
import { CHANNEL_LABELS, TELECOM_CATEGORIES } from "../sectors/telecom";
import { EvidenceHighlighter } from "./EvidenceHighlighter";
import {
  Building2,
  CheckCircle2,
  Layers,
  ArrowRight,
  User,
  Eye,
  Sliders,
  Filter,
  Wrench,
  Clock,
  Radio,
  Lock,
  ChevronRight,
} from "lucide-react";

interface DepartmentViewProps {
  incidents: Incident[];
  complaintsMap: Map<string, Complaint>;
  currentSimTime: number;
  onUpdateIncident: (updated: Incident) => void;
  onInspectIncident: (incident: Incident) => void;
  onApplyFix: (incident: Incident) => void;
}

const DEPARTMENTS: Department[] = [
  "Network Operations Center (NOC)",
  "Field Infrastructure",
  "Customer Care Quality",
  "Billing and Pricing",
  "Number Portability Desk",
  "Manual Review",
];

export const DepartmentView: React.FC<DepartmentViewProps> = ({
  incidents,
  complaintsMap,
  currentSimTime,
  onUpdateIncident,
  onInspectIncident,
  onApplyFix,
}) => {
  const [selectedDept, setSelectedDept] = useState<Department>(
    "Network Operations Center (NOC)"
  );
  const [activeSubTab, setActiveSubTab] = useState<"incidents" | "complaints">("incidents");
  const [ownerInputs, setOwnerInputs] = useState<Record<string, string>>({});
  const [deptError, setDeptError] = useState<string | null>(null);

  // Filter incidents for selected department
  const deptIncidents = incidents.filter((i) => i.department === selectedDept);
  const activeCount = deptIncidents.filter((i) => i.status !== "Resolved").length;
  const resolvedCount = deptIncidents.filter((i) => i.status === "Resolved").length;

  // Filter individual complaints routed to this department
  const deptComplaints = useMemo(() => {
    return Array.from(complaintsMap.values()).filter(
      (c) => c.department === selectedDept
    );
  }, [complaintsMap, selectedDept]);

  const handleAdvance = (incident: Incident, targetStatus: IncidentStatus) => {
    setDeptError(null);
    const res = transitionIncidentStatus(
      incident,
      targetStatus,
      "department",
      `Advanced by ${selectedDept} personnel to ${targetStatus}`,
      currentSimTime
    );
    if (res.success) {
      onUpdateIncident(res.incident);
    } else {
      setDeptError(res.error || "Transition failed");
    }
  };

  const handleAssignOwner = (incident: Incident) => {
    const ownerName = ownerInputs[incident.id] || "";
    if (!ownerName.trim()) return;
    const updated = assignIncidentOwner(
      incident,
      ownerName.trim(),
      "department",
      currentSimTime
    );
    onUpdateIncident(updated);
  };

  return (
    <div className="space-y-6">
      {/* Department Selector Ribbon */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Department Operational Workbench
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Role-based dispatch & operational remediation for DemoTel Baku
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
              Active: <strong>{activeCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
              Resolved: <strong>{resolvedCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 font-medium border border-indigo-200">
              Routed Complaints: <strong>{deptComplaints.length}</strong>
            </span>
          </div>
        </div>

        {/* Department Pills */}
        <div className="pt-3 flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => {
            const count = incidents.filter((i) => i.department === dept).length;
            const isSelected = selectedDept === dept;

            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? "bg-indigo-800 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {deptError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{deptError}</span>
          <button
            onClick={() => setDeptError(null)}
            className="text-rose-600 font-bold ml-2 hover:text-rose-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Sub-Tabs: Incidents vs Individual Complaints */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("incidents")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "incidents"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Incidents Assigned ({deptIncidents.length})
          </button>
          <button
            onClick={() => setActiveSubTab("complaints")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "complaints"
                ? "bg-white text-indigo-700 shadow-2xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Complaints Routed to {selectedDept.split(" ")[0]} ({deptComplaints.length})
          </button>
        </div>
      </div>

      {/* View 1: Incidents Assigned */}
      {activeSubTab === "incidents" && (
        <>
          {deptIncidents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">
                No Incidents Routed to {selectedDept}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All systems under this department are currently operating normally without active anomaly episodes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deptIncidents.map((incident) => {
                const allowedNext = getAllowedNextStatuses(incident.status);
                const lastActivity =
                  incident.activityLog[incident.activityLog.length - 1];

                return (
                  <div
                    key={incident.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      {/* Key, Priority Badge, Status, ID */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-500">
                          {incident.id}
                        </span>
                        {renderPriorityBadge(incident.priority)}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                          Status: {incident.status}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          Key: {incident.category} &times; {incident.district}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm">
                        {incident.title}
                      </h3>

                      {/* Current Count, Owner, Timestamps */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span>
                          Current Count: <strong className="font-mono text-slate-800">{incident.complaintIds.length}</strong> complaints
                        </span>
                        <span>
                          Created: {new Date(incident.createdAt).toLocaleTimeString()}
                        </span>
                        {incident.owner ? (
                          <span className="text-indigo-700 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                            <User className="w-3 h-3" /> Owner: {incident.owner}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium italic">Owner: Unassigned</span>
                        )}
                      </div>

                      {/* Last Activity Entry */}
                      {lastActivity && (
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">Last Activity:</span>
                          <span>{lastActivity.action}</span>
                          <span className="text-slate-400 font-mono">
                            ({new Date(lastActivity.ts).toLocaleTimeString()})
                          </span>
                          <span className="text-slate-500 italic truncate max-w-md">
                            &ldquo;{lastActivity.details}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Workflow Action Buttons Honoring State Machine */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-wrap">
                      {/* Assign Owner */}
                      {!incident.owner && (
                        <div className="flex items-center gap-1 text-xs">
                          <input
                            type="text"
                            value={ownerInputs[incident.id] || ""}
                            onChange={(e) =>
                              setOwnerInputs({
                                ...ownerInputs,
                                [incident.id]: e.target.value,
                              })
                            }
                            placeholder="Assign owner..."
                            className="px-2 py-1 rounded border border-slate-300 text-xs w-32 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleAssignOwner(incident)}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      )}

                      {/* Mark Investigating */}
                      {allowedNext.includes("Investigating") && (
                        <button
                          onClick={() => handleAdvance(incident, "Investigating")}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-colors"
                        >
                          Mark Investigating
                        </button>
                      )}

                      {/* Action Taken */}
                      {allowedNext.includes("Action Taken") && (
                        <button
                          onClick={() => handleAdvance(incident, "Action Taken")}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-colors"
                        >
                          Action Taken
                        </button>
                      )}

                      {/* Apply fix (demo) */}
                      {(incident.status === "Action Taken" ||
                        incident.status === "Investigating") && (
                        <button
                          onClick={() => onApplyFix(incident)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                          title="Reduces complaints for this key and transitions incident to Monitoring"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Apply fix (demo)</span>
                        </button>
                      )}

                      {/* Resolve */}
                      {allowedNext.includes("Resolved") && (
                        <button
                          onClick={() => handleAdvance(incident, "Resolved")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition-colors"
                        >
                          Resolve
                        </button>
                      )}

                      {/* Other allowed status transitions fallback */}
                      {allowedNext
                        .filter(
                          (s) =>
                            s !== "Investigating" &&
                            s !== "Action Taken" &&
                            s !== "Resolved"
                        )
                        .map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => handleAdvance(incident, nextStatus)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition-colors"
                          >
                            &rarr; {nextStatus}
                          </button>
                        ))}

                      {/* Inspect Full Dossier */}
                      <button
                        onClick={() => onInspectIncident(incident)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-indigo-700 font-semibold text-xs border border-slate-300 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Dossier</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* View 2: Complaints Routed to This Department */}
      {activeSubTab === "complaints" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600" />
                Complaints Deterministically Routed to {selectedDept} ({deptComplaints.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Routing determined exclusively by code-side routing table
              </p>
            </div>
          </div>

          {deptComplaints.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No complaints currently routed to this department.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto divide-y divide-slate-100">
              {deptComplaints.map((c) => (
                <div key={c.id} className="pt-2 text-xs flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[11px] font-bold text-slate-600">
                        {c.id}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(c.ts).toLocaleTimeString()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {CHANNEL_LABELS[c.channel]}
                      </span>
                      {c.analysis?.district && (
                        <span className="text-[10px] font-semibold text-slate-700">
                          Dist: {c.analysis.district}
                        </span>
                      )}
                      {c.hasMaskedData && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock className="w-2.5 h-2.5" /> masked
                        </span>
                      )}
                    </div>
                    <EvidenceHighlighter
                      text={c.maskedText}
                      evidencePhrases={c.analysis?.evidence_phrases || []}
                    />
                    {c.routedReason && (
                      <p className="text-[10px] text-slate-400 mt-0.5 italic">
                        Route reason: {c.routedReason}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    {c.source === "live_ai" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        live_ai
                      </span>
                    )}
                    {c.source === "cached_ai" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                        cached_ai
                      </span>
                    )}
                    {c.source === "offline_fixture" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">
                        offline_fixture
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
