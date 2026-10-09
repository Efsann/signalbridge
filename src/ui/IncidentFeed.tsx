import React, { useState } from "react";
import { Incident, Alert, Complaint, District, IncidentPriority } from "../types";
import { TELECOM_CATEGORIES } from "../sectors/telecom";
import {
  AlertOctagon,
  AlertTriangle,
  Zap,
  Eye,
  Building2,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  Activity,
  X,
} from "lucide-react";

interface IncidentFeedProps {
  incidents: Incident[];
  alerts: Alert[];
  complaintsMap: Map<string, Complaint>;
  selectedDistrict: District | null;
  onInspectIncident?: (incident: Incident) => void;
}

export function renderPriorityBadge(priority: IncidentPriority) {
  switch (priority) {
    case "Critical":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertOctagon className="w-3 h-3 text-rose-600" /> Critical
        </span>
      );
    case "High":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
          <AlertTriangle className="w-3 h-3 text-orange-600" /> High
        </span>
      );
    case "Medium":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Zap className="w-3 h-3 text-amber-600" /> Medium
        </span>
      );
    case "Low":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <Eye className="w-3 h-3 text-blue-600" /> Watching
        </span>
      );
  }
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  alerts,
  complaintsMap,
  selectedDistrict,
  onInspectIncident,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filter by selected district if active
  const filteredIncidents = selectedDistrict
    ? incidents.filter((inc) => inc.district === selectedDistrict)
    : incidents;

  const filteredAlerts = selectedDistrict
    ? alerts.filter((a) => a.key.district === selectedDistrict)
    : alerts;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Active Incidents Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Active Incident Episodes ({filteredIncidents.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Code-created incidents deduplicated by (category, district) episode
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {incidents.filter((i) => i.status === "New").length} New
          </span>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center my-auto">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Active Incidents</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Normal operating conditions. Inject a scenario (e.g. S1 or S2) to trigger an anomaly.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => (onInspectIncident ? onInspectIncident(inc) : setSelectedIncident(inc))}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {renderPriorityBadge(inc.priority)}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">
                        {inc.status}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        {inc.id}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {inc.title}
                    </h4>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-1" />
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    <Building2 className="w-3 h-3" /> {inc.department}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                    <Layers className="w-3 h-3 text-slate-400" /> {inc.complaintIds.length} complaints attached
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Feed Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Statistical Anomaly Alert Ticker ({filteredAlerts.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live triggers evaluated via K&times;Std dev and sliding window counts
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Cooldown: 15m
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center my-auto">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Anomaly Triggers in Window</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All categories and districts within 3&sigma; normal traffic variation.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {filteredAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs text-slate-800"
              >
                <div className="flex items-center justify-between font-mono text-[11px] text-amber-900 font-bold mb-1">
                  <span>{alt.id}</span>
                  <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.2 rounded text-amber-950 font-sans">
                    Z: {alt.zScore.toFixed(2)}
                  </span>
                </div>

                <div className="font-semibold text-slate-900 text-xs">
                  {TELECOM_CATEGORIES[alt.key.category]?.displayName} in {alt.key.district}
                </div>

                <div className="mt-2 pt-1.5 border-t border-amber-200/80 grid grid-cols-3 gap-1 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">15m Count:</span>
                    <strong className="text-slate-900">{alt.count}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Threshold:</span>
                    <strong className="text-slate-900">{alt.ruleThreshold.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Baseline Mean:</span>
                    <strong className="text-slate-900">{alt.baselineMean.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {selectedIncident.id}
                  </span>
                  {renderPriorityBadge(selectedIncident.priority)}
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedIncident.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Metadata Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">District:</span>
                  <strong className="text-slate-900">{selectedIncident.district}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Department:</span>
                  <strong className="text-indigo-800">{selectedIncident.department}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Complaints:</span>
                  <strong className="text-slate-900">{selectedIncident.complaintIds.length}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Status:</span>
                  <strong className="text-slate-900">{selectedIncident.status}</strong>
                </div>
              </div>

              {/* Activity Log Audit Trail */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Incident Activity Audit Log
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1">
                  {selectedIncident.activityLog.map((act, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{act.action}</span>
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

              {/* Attached Complaints List */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Attached Complaints ({selectedIncident.complaintIds.length})
                </h4>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                  {selectedIncident.complaintIds.map((cid) => {
                    const c = complaintsMap.get(cid);
                    return (
                      <div key={cid} className="p-2.5 hover:bg-slate-50 text-[11px]">
                        <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-0.5">
                          <span>{cid}</span>
                          <span>{c ? new Date(c.ts).toLocaleTimeString() : ""}</span>
                        </div>
                        <p className="text-slate-800 line-clamp-1">{c?.maskedText || "Complaint text unavailable"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
