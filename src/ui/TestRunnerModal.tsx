import React, { useState } from "react";
import { runSignalBridgeUnitTests, TestCaseResult } from "../test/suite";
import { CheckCircle2, XCircle, Play, ShieldCheck, X } from "lucide-react";

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestCaseResult[]>(() => runSignalBridgeUnitTests());

  if (!isOpen) return null;

  const handleRerun = () => {
    setResults(runSignalBridgeUnitTests());
  };

  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = passCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${allPassed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">SignalBridge Unit Test Suite</h3>
              <p className="text-xs text-slate-500">
                Verifies PII Masking, Routing, Detection, Priority, State Machine, and Post-Fix Monitoring
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Verification Result:</span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  allPassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}
              >
                {passCount} / {totalCount} Passed ({Math.round((passCount / totalCount) * 100)}%)
              </span>
            </div>
            <button
              onClick={handleRerun}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5 text-indigo-600" /> Re-run Suite
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase px-1">
              PII Masking & Routing Invariant Tests
            </h4>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {results.map((test, index) => (
                <div key={index} className="p-3 text-xs flex items-start gap-3 hover:bg-slate-50/80 transition-colors">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold">
                        {test.suite}
                      </span>
                      <span className="font-medium text-slate-900">{test.name}</span>
                    </div>
                    {test.error && (
                      <p className="mt-1 font-mono text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 text-[11px]">
                        {test.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
