/**
 * Data and Disclosure Tab (Stage 4)
 * Fully data-driven from constants:
 * - Model used (GEMINI_MODEL) & library inventory
 * - Real published sources used to shape demo distributions
 * - Explicit synthetic data disclosure statement
 * - Limitations and operational boundaries
 * - "From demo to production" blueprint table
 */

import React from "react";
import {
  REAL_SOURCES,
  SYNTHETIC_DATA_DISCLOSURE,
  DISCLOSURE_LIMITATIONS,
  DEMO_TO_PRODUCTION_COMPARISON,
  LIBRARIES_INVENTORY,
} from "../eval/disclosureConstants";
import { GEMINI_MODEL, PROMPT_VERSION, OPERATOR_NAME, OPERATOR_LOCATION } from "../config";
import {
  ShieldAlert,
  ExternalLink,
  BookOpen,
  Server,
  Layers,
  AlertTriangle,
  Info,
} from "lucide-react";

export const DataDisclosureTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Data, Methodology & Production Disclosure
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Transparency documentation for SignalBridge ({OPERATOR_NAME}, {OPERATOR_LOCATION}).
          Clarifying synthetic boundaries, empirical assumptions, research origins, and engineering path to production.
        </p>
      </div>

      {/* Mandatory Synthetic Data Disclosure Callout */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
            Synthetic Data Declaration
          </h4>
          <p className="font-medium text-amber-950 leading-relaxed">
            "{SYNTHETIC_DATA_DISCLOSURE}"
          </p>
        </div>
      </div>

      {/* Real Published Sources */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Real Published Reference Sources (Distribution Inspiration Only)
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          The following public governmental and journalistic records were consulted solely to calibrate realistic category taxonomy breakdowns and broad regional distribution weights for simulation:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REAL_SOURCES.map((src, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-slate-900 text-xs">{src.title}</h4>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 font-medium"
                >
                  <span>Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-600 text-[11px]">{src.description}</p>
              <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                <strong>Role in Demo:</strong> {src.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model & Software Bill of Materials */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Model & Core Libraries
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
              Model: {GEMINI_MODEL}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Prompt: {PROMPT_VERSION}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2">Library / Component</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-4 py-2">Purpose in SignalBridge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {LIBRARIES_INVENTORY.map((lib, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-bold text-slate-800">{lib.name}</td>
                  <td className="px-3 py-2 text-indigo-700">{lib.version}</td>
                  <td className="px-4 py-2 font-sans text-slate-600 text-xs">{lib.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Limitations Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            System Limitations & Boundary Assumptions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {DISCLOSURE_LIMITATIONS.map((lim, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/30 space-y-1"
            >
              <span className="font-bold text-slate-900 block text-[11px]">
                {lim.category}
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {lim.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* From Demo to Production Architecture Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              From Demo to Production Roadmap
            </h3>
          </div>
          <span className="text-[11px] font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            Note: A key in a frontend app is visible in the browser
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 w-1/4">Engineering Dimension</th>
                <th className="px-3 py-2 w-1/3">Now (Interactive Demo)</th>
                <th className="px-3 py-2 w-5/12">Production Target Blueprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {DEMO_TO_PRODUCTION_COMPARISON.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-bold text-slate-800">{row.dimension}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-600 text-[11px] bg-slate-50/30">
                    {row.demoState}
                  </td>
                  <td className="px-3 py-2.5 font-sans font-medium text-indigo-900 bg-indigo-50/30">
                    {row.productionBlueprint}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
