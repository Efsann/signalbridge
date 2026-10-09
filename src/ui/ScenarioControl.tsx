import React, { useState } from "react";
import { SCENARIOS, ScenarioDefinition, generateScenarioComplaints } from "../sim/generator";
import { classifyComplaint } from "../ai/classify";
import { Play, Sparkles, AlertOctagon, CheckCircle2, RefreshCw, Zap } from "lucide-react";

interface ScenarioControlProps {
  currentSimTime: number;
  onInjectScenario: (scenario: ScenarioDefinition) => void;
  onPrecomputeComplete?: () => void;
}

export const ScenarioControl: React.FC<ScenarioControlProps> = ({
  currentSimTime,
  onInjectScenario,
  onPrecomputeComplete,
}) => {
  const [isPrecomputing, setIsPrecomputing] = useState(false);
  const [precomputeProgress, setPrecomputeProgress] = useState<{ current: number; total: number } | null>(null);

  const handlePrecomputeAll = async () => {
    setIsPrecomputing(true);
    try {
      // Collect complaints from all scenarios S1-S5
      const allScenarioComplaints = [
        ...generateScenarioComplaints(SCENARIOS.S1, currentSimTime, 101),
        ...generateScenarioComplaints(SCENARIOS.S2, currentSimTime, 102),
        ...generateScenarioComplaints(SCENARIOS.S3, currentSimTime, 103),
        ...generateScenarioComplaints(SCENARIOS.S4, currentSimTime, 104),
        ...generateScenarioComplaints(SCENARIOS.S5, currentSimTime, 105),
      ];

      const total = allScenarioComplaints.length;
      let completed = 0;
      setPrecomputeProgress({ current: 0, total });

      // Run precomputation using 4-parallel concurrency limit
      // classifyComplaint internally uses the concurrency limiter (max 4)
      const tasks = allScenarioComplaints.map(async (c) => {
        try {
          await classifyComplaint(c.maskedText, { bypassCache: false });
        } catch {
          // ignore individual errors
        } finally {
          completed++;
          setPrecomputeProgress({ current: completed, total });
        }
      });

      await Promise.all(tasks);
      alert(`Precomputation completed for ${total} scenario complaints! AI outputs cached in localStorage.`);
      if (onPrecomputeComplete) onPrecomputeComplete();
    } catch (err: any) {
      alert(`Precomputation error: ${err.message}`);
    } finally {
      setIsPrecomputing(false);
      setPrecomputeProgress(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Reproducible Scenario Library (Ground-Truth Injections)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Fixed random seeds ensure exact mathematical repeatability across test runs.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrecomputeAll}
          disabled={isPrecomputing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
          title="Classify entire scenario stream with 4-call concurrency limit and save to localStorage cache"
        >
          {isPrecomputing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>
                Precomputing ({precomputeProgress?.current}/{precomputeProgress?.total})...
              </span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Precompute AI for Scenario Stream</span>
            </>
          )}
        </button>
      </div>

      {/* Scenario Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {Object.values(SCENARIOS).map((scenario) => {
          const isAlertExpected = scenario.expectedOutcome === "ALERT";

          return (
            <div
              key={scenario.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-slate-300 transition-all text-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-bold text-slate-900">{scenario.code}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isAlertExpected
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {isAlertExpected ? (
                      <>
                        <AlertOctagon className="w-2.5 h-2.5 text-rose-600" /> Exp: Alert
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Exp: Normal
                      </>
                    )}
                  </span>
                </div>

                <p className="font-semibold text-slate-800 text-[11px] line-clamp-1">
                  {scenario.title.split(": ")[1]}
                </p>

                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                  {scenario.description}
                </p>

                <div className="mt-2 text-[10px] text-slate-600 space-y-0.5 font-mono">
                  <div>+{scenario.extraCount} extra complaints</div>
                  <div>Window: {scenario.durationMinutes} min</div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => onInjectScenario(scenario)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-300 hover:border-indigo-600 font-semibold text-[11px] shadow-2xs transition-colors"
                >
                  <Play className="w-3 h-3 text-indigo-500 group-hover:text-white" />
                  <span>Inject {scenario.code}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
