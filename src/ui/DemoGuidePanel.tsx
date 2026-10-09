/**
 * Demo Guide Panel (Stage 4)
 * Numbered guided tour with actions:
 * 1 Submit an Azerbaijani complaint
 * 2 Inject similar complaints
 * 3 Run S1 at x30
 * 4 Open the incident and read the evidence
 * 5 Department View accept
 * 6 Apply fix and watch monitoring
 * 7 Open Evaluation
 * Plus: Reset demo (keeps AI cache) and Replay (re-run the last scenario from cache deterministically).
 */

import React, { useState } from "react";
import {
  Sparkles,
  SendHorizontal,
  PlusCircle,
  FastForward,
  Search,
  Building2,
  Wrench,
  BarChart2,
  RotateCcw,
  Repeat,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Incident } from "../types";

export interface DemoGuideProps {
  onStep1SubmitAZ: () => void;
  onStep2InjectSimilar: () => void;
  onStep3RunS1x30: () => void;
  onStep4OpenIncidentEvidence: () => void;
  onStep5DepartmentAccept: () => void;
  onStep6ApplyFixMonitoring: () => void;
  onStep7OpenEvaluation: () => void;
  onResetDemo: () => void;
  onReplayLastScenario: () => void;
  hasActiveIncidents: boolean;
  selectedIncident: Incident | null;
}

export const DemoGuidePanel: React.FC<DemoGuideProps> = ({
  onStep1SubmitAZ,
  onStep2InjectSimilar,
  onStep3RunS1x30,
  onStep4OpenIncidentEvidence,
  onStep5DepartmentAccept,
  onStep6ApplyFixMonitoring,
  onStep7OpenEvaluation,
  onResetDemo,
  onReplayLastScenario,
  hasActiveIncidents,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl text-white shadow-lg overflow-hidden transition-all text-xs">
      {/* Top Banner */}
      <div className="px-4 py-2.5 bg-slate-950 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="font-bold tracking-wide uppercase text-[11px] text-amber-400">
            SignalBridge Interactive Demo Guide
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            &middot; Follow 1 through 7 for full workflow walkthrough
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetDemo}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] border border-slate-700 transition-colors"
            title="Reset simulation to 08:00 (preserves AI model cache)"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Demo</span>
          </button>

          <button
            onClick={onReplayLastScenario}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 font-semibold text-[11px] border border-indigo-700 transition-colors"
            title="Deterministically replay last scenario from cache"
          >
            <Repeat className="w-3 h-3 text-indigo-300" />
            <span>Replay</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Guide Steps */}
      {isExpanded && (
        <div className="p-3 bg-slate-900/90 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <button
            onClick={onStep1SubmitAZ}
            className="flex flex-col items-start p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                1
              </span>
              <SendHorizontal className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <span className="font-bold text-[11px] text-slate-200 group-hover:text-white">
              Submit AZ
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-1">
              Azerbaijani complaint
            </span>
          </button>

          <button
            onClick={onStep2InjectSimilar}
            className="flex flex-col items-start p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                2
              </span>
              <PlusCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <span className="font-bold text-[11px] text-slate-200 group-hover:text-white">
              Inject Similar
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-1">
              Batch + pending queue
            </span>
          </button>

          <button
            onClick={onStep3RunS1x30}
            className="flex flex-col items-start p-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/60 hover:border-indigo-400 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-indigo-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                3
              </span>
              <FastForward className="w-3.5 h-3.5 text-indigo-300 group-hover:text-indigo-200" />
            </div>
            <span className="font-bold text-[11px] text-indigo-200 group-hover:text-white">
              Run S1 at x30
            </span>
            <span className="text-[10px] text-indigo-300/80 line-clamp-1">
              Binəqədi fiber cut spike
            </span>
          </button>

          <button
            onClick={onStep4OpenIncidentEvidence}
            className="flex flex-col items-start p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                4
              </span>
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <span className="font-bold text-[11px] text-slate-200 group-hover:text-white">
              Open Evidence
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-1">
              "Why was this flagged?"
            </span>
          </button>

          <button
            onClick={onStep5DepartmentAccept}
            className="flex flex-col items-start p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                5
              </span>
              <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <span className="font-bold text-[11px] text-slate-200 group-hover:text-white">
              Dept Accept
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-1">
              NOC assign & investigate
            </span>
          </button>

          <button
            onClick={onStep6ApplyFixMonitoring}
            className="flex flex-col items-start p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                6
              </span>
              <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <span className="font-bold text-[11px] text-slate-200 group-hover:text-white">
              Apply Fix
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-1">
              Post-fix sparkline trend
            </span>
          </button>

          <button
            onClick={onStep7OpenEvaluation}
            className="flex flex-col items-start p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 hover:border-emerald-400 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center font-mono">
                7
              </span>
              <BarChart2 className="w-3.5 h-3.5 text-emerald-300 group-hover:text-emerald-200" />
            </div>
            <span className="font-bold text-[11px] text-emerald-200 group-hover:text-white">
              Open Eval
            </span>
            <span className="text-[10px] text-emerald-300/80 line-clamp-1">
              AI vs Baseline suite
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
