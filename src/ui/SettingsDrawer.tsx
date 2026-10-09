import React from "react";
import { DetectionSettings, DEFAULT_DETECTION_SETTINGS } from "../engine/detection";
import { Sliders, X, RotateCcw, Info } from "lucide-react";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DetectionSettings;
  onSaveSettings: (settings: DetectionSettings) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = React.useState<DetectionSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setLocalSettings(DEFAULT_DETECTION_SETTINGS);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Detection Engine Settings</h3>
              <p className="text-xs text-slate-500">Tune statistical thresholds & cooldown duration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-6 space-y-4 text-xs">
          {/* Parameter 1: K (Std Dev multiplier) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                K Factor (Standard Deviation Multiplier):
              </label>
              <span className="font-mono font-bold text-indigo-600">{localSettings.k} &sigma;</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="6.0"
              step="0.5"
              value={localSettings.k}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, k: parseFloat(e.target.value) })
              }
              className="w-full accent-indigo-600"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              Alert condition requires: count &ge; mean + K &times; std. Higher K reduces false alarms.
            </p>
          </div>

          {/* Parameter 2: MIN_COUNT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                Minimum Count Floor (MIN_COUNT):
              </label>
              <span className="font-mono font-bold text-indigo-600">{localSettings.minCount} complaints</span>
            </div>
            <input
              type="number"
              min="2"
              max="30"
              value={localSettings.minCount}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, minCount: parseInt(e.target.value) || 8 })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              Absolute minimum complaints required in a 15-min window before an alert triggers.
            </p>
          </div>

          {/* Parameter 3: FIXED_THRESHOLD */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                Company-Wide Fixed Surge Threshold:
              </label>
              <span className="font-mono font-bold text-indigo-600">{localSettings.fixedThreshold} complaints</span>
            </div>
            <input
              type="number"
              min="15"
              max="150"
              value={localSettings.fixedThreshold}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, fixedThreshold: parseInt(e.target.value) || 40 })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comparator baseline rule: triggers alert if total company-wide complaints in 15m &ge; threshold.
            </p>
          </div>

          {/* Parameter 4: COOLDOWN_MIN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                Episode Cooldown (COOLDOWN_MIN):
              </label>
              <span className="font-mono font-bold text-indigo-600">{localSettings.cooldownMin} minutes</span>
            </div>
            <input
              type="number"
              min="5"
              max="60"
              value={localSettings.cooldownMin}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, cooldownMin: parseInt(e.target.value) || 15 })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              One alert per episode rule: suppresses repeat alerts for the same key within cooldown.
            </p>
          </div>

          {/* Synthetic Assumption Notice */}
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Synthetic Baseline Assumptions</p>
              <p className="mt-0.5 text-amber-800">
                Baselines are computed from 14 simulated days of normal traffic with an assumed volume of
                ~30 complaints per 15 minutes company-wide. Time-of-day seasonality is intentionally ignored in Stage 2.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
