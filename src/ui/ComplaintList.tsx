import React, { useState, useMemo } from "react";
import { Complaint, CategoryId, Channel, Department, ComplaintSource } from "../types";
import { TELECOM_CATEGORIES, CHANNEL_LABELS } from "../sectors/telecom";
import { EvidenceHighlighter } from "./EvidenceHighlighter";
import {
  Search,
  Filter,
  Lock,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Eye,
  X,
  ShieldAlert,
} from "lucide-react";

interface ComplaintListProps {
  complaints: Complaint[];
}

export const ComplaintList: React.FC<ComplaintListProps> = ({ complaints }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Runtime computed filtered data
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesText =
          c.rawText.toLowerCase().includes(query) ||
          c.maskedText.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          (c.analysis?.summary && c.analysis.summary.toLowerCase().includes(query));
        if (!matchesText) return false;
      }

      // Category
      if (filterCategory !== "all") {
        if (c.analysis?.category !== filterCategory) return false;
      }

      // Department
      if (filterDepartment !== "all") {
        if (c.department !== filterDepartment) return false;
      }

      // Source
      if (filterSource !== "all") {
        if (c.source !== filterSource) return false;
      }

      return true;
    });
  }, [complaints, searchTerm, filterCategory, filterDepartment, filterSource]);

  // Runtime computed metrics
  const totalCount = complaints.length;
  const liveCount = complaints.filter((c) => c.source === "live_ai").length;
  const cachedCount = complaints.filter((c) => c.source === "cached_ai").length;
  const failedCount = complaints.filter((c) => c.source === "ai_failed").length;
  const manualReviewCount = complaints.filter((c) => c.department === "Manual Review").length;

  return (
    <div className="space-y-4">
      {/* Header & Quick Filter Pills */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Processed Complaints Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live in-memory registry of triaged complaints for DemoTel Baku
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
              Total: <strong>{totalCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
              Live AI: <strong>{liveCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-medium border border-blue-200">
              Cached AI: <strong>{cachedCount}</strong>
            </span>
            {failedCount > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 font-medium border border-rose-200">
                AI Failed: <strong>{failedCount}</strong>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200">
              Manual Review: <strong>{manualReviewCount}</strong>
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search text, ID, summary..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter by Category"
            >
              <option value="all">All Categories ({totalCount})</option>
              {Object.values(TELECOM_CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter by Department"
            >
              <option value="all">All Departments</option>
              <option value="Network Operations Center (NOC)">NOC</option>
              <option value="Field Infrastructure">Field Infrastructure</option>
              <option value="Customer Care Quality">Customer Care Quality</option>
              <option value="Billing and Pricing">Billing and Pricing</option>
              <option value="Number Portability Desk">Number Portability Desk</option>
              <option value="Manual Review">Manual Review</option>
            </select>
          </div>

          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              aria-label="Filter by Source"
            >
              <option value="all">All Sources</option>
              <option value="live_ai">Live AI</option>
              <option value="cached_ai">Cached AI</option>
              <option value="ai_failed">AI Failed</option>
              <option value="offline_fixture">Offline Fixture</option>
            </select>
          </div>
        </div>
      </div>

      {/* List or Table */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">
            {complaints.length === 0 ? "No Complaints Recorded Yet" : "No Matching Complaints"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {complaints.length === 0
              ? "Use the intake form above or click one of the benchmark examples to submit your first complaint."
              : "Try adjusting your search keywords or clearing the category and department filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">ID & Time</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Complaint Text</th>
                  <th className="px-4 py-3">Category & District</th>
                  <th className="px-4 py-3">Department (Routing)</th>
                  <th className="px-4 py-3">Severity & Confidence</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID & Time */}
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      <span className="font-mono font-bold text-slate-900 block">{c.id}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.ts).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] block text-center">
                        {CHANNEL_LABELS[c.channel]}
                      </span>
                      {c.analysis?.language && (
                        <span className="text-[10px] font-mono text-slate-400 block text-center mt-1 uppercase">
                          Lang: {c.analysis.language}
                        </span>
                      )}
                    </td>

                    {/* Complaint Text */}
                    <td className="px-4 py-3 max-w-xs align-top">
                      <div className="flex items-center gap-1.5 mb-1">
                        {c.hasMaskedData && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            <Lock className="w-2.5 h-2.5" /> masked
                          </span>
                        )}
                        {c.groundingWarnings !== undefined && c.groundingWarnings > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-2.5 h-2.5" /> {c.groundingWarnings} warning
                          </span>
                        )}
                        {c.analysis?.contains_instructions_to_system && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            <ShieldAlert className="w-2.5 h-2.5" /> injection
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-slate-800 font-sans text-xs">
                        {c.maskedText}
                      </p>
                      {c.analysis?.summary && (
                        <p className="line-clamp-1 text-[11px] text-slate-500 italic mt-0.5">
                          "{c.analysis.summary}"
                        </p>
                      )}
                    </td>

                    {/* Category & District */}
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      {c.analysis ? (
                        <>
                          <span className="font-semibold text-slate-900 block">
                            {TELECOM_CATEGORIES[c.analysis.category]?.displayName ||
                              c.analysis.category}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            District: <strong>{c.analysis.district}</strong>
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No analysis</span>
                      )}
                    </td>

                    {/* Department (Routing) */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded ${
                            c.department === "Manual Review"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-indigo-50 text-indigo-900 border border-indigo-200"
                          }`}
                        >
                          {c.department || "Manual Review"}
                        </span>
                      </div>
                      {c.isOverriddenToManual && (
                        <span className="text-[10px] text-amber-700 block mt-0.5 font-medium">
                          Override applied
                        </span>
                      )}
                    </td>

                    {/* Severity & Confidence */}
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      {c.analysis ? (
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded font-bold text-[10px] ${
                              c.analysis.severity === 3
                                ? "bg-rose-100 text-rose-800"
                                : c.analysis.severity === 2
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            Sev {c.analysis.severity}
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 block">
                            Conf: {Math.round(c.analysis.confidence * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>

                    {/* Source Badge */}
                    <td className="px-4 py-3 whitespace-nowrap align-top">
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
                      {c.source === "ai_failed" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                          ai_failed
                        </span>
                      )}
                      {c.source === "offline_fixture" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          offline_fixture
                        </span>
                      )}
                      {c.source === "pending_ai" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          pending_ai
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right align-top">
                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Detail Drawer / Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {selectedComplaint.id}
                </span>
                <h3 className="font-semibold text-slate-900 text-sm">
                  Complaint Diagnostic & Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Raw vs Masked Comparison */}
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Raw Customer Input (Unmasked)
                  </span>
                  <div className="p-3 rounded-lg bg-slate-100 text-slate-800 font-sans text-xs">
                    {selectedComplaint.rawText}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Masked Text Sent to Gemini
                    </span>
                    {selectedComplaint.hasMaskedData && (
                      <span className="text-[11px] text-amber-700 font-semibold">
                        [PII Masked]
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <EvidenceHighlighter
                      text={selectedComplaint.maskedText}
                      evidencePhrases={selectedComplaint.analysis?.evidence_phrases || []}
                    />
                  </div>
                </div>
              </div>

              {/* Analysis & Routing */}
              {selectedComplaint.analysis ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block">Category:</span>
                      <strong className="text-slate-900">
                        {TELECOM_CATEGORIES[selectedComplaint.analysis.category]?.displayName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">District:</span>
                      <strong className="text-slate-900">{selectedComplaint.analysis.district}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Severity:</span>
                      <strong className="text-slate-900">Level {selectedComplaint.analysis.severity}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Model Confidence:</span>
                      <strong className="text-slate-900">
                        {Math.round(selectedComplaint.analysis.confidence * 100)}%
                      </strong>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-slate-500 block">Department Routing Decision:</span>
                    <strong className="text-indigo-900 text-sm">{selectedComplaint.department}</strong>
                    <p className="text-slate-600 text-[11px] mt-0.5">{selectedComplaint.routedReason}</p>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-slate-500 block">English Summary:</span>
                    <p className="text-slate-800 italic">"{selectedComplaint.analysis.summary}"</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                  <strong>Status:</strong> {selectedComplaint.routedReason || "Needs manual review"}
                  {selectedComplaint.errorMessage && (
                    <p className="mt-1 font-mono text-[11px] text-rose-600">
                      {selectedComplaint.errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Performance & Token Telemetry */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span>Source: </span>
                  <strong className="font-mono text-slate-800">{selectedComplaint.source}</strong>
                </div>
                {selectedComplaint.latencyMs !== undefined && (
                  <div>
                    <span>Latency: </span>
                    <strong className="font-mono text-slate-800">{selectedComplaint.latencyMs} ms</strong>
                  </div>
                )}
                {selectedComplaint.tokens && (
                  <div>
                    <span>Tokens: </span>
                    <strong className="font-mono text-slate-800">
                      {selectedComplaint.tokens.totalTokens} ({selectedComplaint.tokens.promptTokens} in /{" "}
                      {selectedComplaint.tokens.candidatesTokens} out)
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
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
