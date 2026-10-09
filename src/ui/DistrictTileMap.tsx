import React from "react";
import { District, CategoryId } from "../types";
import { BAKU_DISTRICTS, GLOBAL_BASELINES, makeKey } from "../sim/generator";
import { CheckCircle2, AlertTriangle, AlertOctagon, Eye, MapPin } from "lucide-react";

interface DistrictTileMapProps {
  selectedDistrict: District | null;
  onSelectDistrict: (district: District | null) => void;
  districtCounts: Map<District, { count: number; maxZScore: number; topCategory?: CategoryId; isAlert: boolean; isWatching: boolean; isCritical: boolean }>;
}

// 15 districts: 12 Baku districts + Abşeron–Xırdalan + Saatlı + Other regions
const ALL_15_DISTRICTS: District[] = [
  ...BAKU_DISTRICTS,
  "Abşeron–Xırdalan",
  "Saatlı",
  "Other regions",
];

export const DistrictTileMap: React.FC<DistrictTileMapProps> = ({
  selectedDistrict,
  onSelectDistrict,
  districtCounts,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            Schematic District Anomaly Matrix (Baku & Regions)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong className="text-slate-700">Schematic, not geographic</strong>. Displays current 15-minute sliding window status per district.
          </p>
        </div>

        {/* Legend: Text + Icon + Color (Never color only) */}
        <div className="flex items-center gap-3 text-[11px] flex-wrap">
          <div className="flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Normal
          </div>
          <div className="flex items-center gap-1 font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Eye className="w-3 h-3 text-blue-600" /> Watching
          </div>
          <div className="flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Anomaly Alert
          </div>
          <div className="flex items-center gap-1 font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
            <AlertOctagon className="w-3 h-3 text-rose-600" /> Critical Spike
          </div>
        </div>
      </div>

      {/* 15-Tile Schematic Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {ALL_15_DISTRICTS.map((district) => {
          const stats = districtCounts.get(district) || {
            count: 0,
            maxZScore: 0,
            isAlert: false,
            isWatching: false,
            isCritical: false,
          };

          const isSelected = selectedDistrict === district;

          // Determine visual styling and label (accessible icon + text)
          let statusLabel = "Normal";
          let StatusIcon = CheckCircle2;
          let tileBg = "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700";
          let badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200";

          if (stats.isCritical) {
            statusLabel = "Critical";
            StatusIcon = AlertOctagon;
            tileBg = "bg-rose-50/80 border-rose-400 hover:border-rose-500 text-rose-950 ring-1 ring-rose-400/50";
            badgeBg = "bg-rose-200 text-rose-900 border-rose-300";
          } else if (stats.isAlert) {
            statusLabel = "Alert";
            StatusIcon = AlertTriangle;
            tileBg = "bg-amber-50/80 border-amber-400 hover:border-amber-500 text-amber-950 ring-1 ring-amber-400/50";
            badgeBg = "bg-amber-200 text-amber-900 border-amber-300";
          } else if (stats.isWatching || stats.count > 3) {
            statusLabel = "Watching";
            StatusIcon = Eye;
            tileBg = "bg-blue-50/80 border-blue-300 hover:border-blue-400 text-blue-950";
            badgeBg = "bg-blue-200 text-blue-900 border-blue-300";
          }

          if (isSelected) {
            tileBg += " ring-2 ring-indigo-600 ring-offset-1";
          }

          return (
            <button
              key={district}
              type="button"
              onClick={() => onSelectDistrict(isSelected ? null : district)}
              className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between ${tileBg} cursor-pointer group shadow-2xs`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {district}
                  </span>
                  <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>15m Count:</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {stats.count}
                  </span>
                </div>

                {stats.maxZScore > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Z-Score:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {stats.maxZScore.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${badgeBg}`}>
                  <StatusIcon className="w-2.5 h-2.5" /> {statusLabel}
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-indigo-500">
                  {isSelected ? "Clear ✕" : "Filter →"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedDistrict && (
        <div className="mt-3 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
          <span className="font-medium">
            Filtering feeds by district: <strong>{selectedDistrict}</strong>
          </span>
          <button
            onClick={() => onSelectDistrict(null)}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline ml-2"
          >
            Show All Districts
          </button>
        </div>
      )}
    </div>
  );
};
