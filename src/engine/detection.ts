/**
 * Anomaly Detection Engine for SignalBridge
 * Features:
 * - 5-minute buckets with sliding 15-minute evaluation window
 * - Per-key (category, district) statistical Z-score thresholding
 * - One alert per episode with configurable cooldown
 * - Fixed-threshold comparator rule for company-wide surges
 * - Pure function design with no UI dependencies
 */

import { Alert, CategoryId, District, Complaint } from "../types";
import { BaselineMap, GLOBAL_BASELINES, makeKey } from "../sim/generator";
import {
  DEFAULT_MIN_COUNT,
  DEFAULT_K,
  DEFAULT_FIXED_THRESHOLD,
  DEFAULT_COOLDOWN_MIN,
  WINDOW_DURATION_MIN,
} from "../config";

export interface DetectionSettings {
  k: number;
  minCount: number;
  fixedThreshold: number;
  cooldownMin: number;
}

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  k: DEFAULT_K,
  minCount: DEFAULT_MIN_COUNT,
  fixedThreshold: DEFAULT_FIXED_THRESHOLD,
  cooldownMin: DEFAULT_COOLDOWN_MIN,
};

export interface ActiveEpisode {
  episodeId: string;
  alertId: string;
  incidentId: string;
  category: CategoryId;
  district: District;
  firstTriggeredAt: number;
  lastTriggeredAt: number;
  peakCount: number;
  complaintIds: Set<string>;
}

export interface DetectionResult {
  windowStart: number;
  windowEnd: number;
  totalCompanyCount: number;
  unknownDistrictCount: number;
  newAlerts: Alert[];
  continuingEpisodes: {
    episode: ActiveEpisode;
    newComplaintIds: string[];
    currentCount: number;
  }[];
  updatedEpisodes: Map<string, ActiveEpisode>;
  fixedThresholdAlert?: {
    totalCount: number;
    threshold: number;
    complaintIds: string[];
  };
}

/**
 * Pure evaluation function: scans complaints in the 15-minute sliding window up to currentSimTime.
 * Only complaints with arrived analysis (source !== 'pending_ai') are counted.
 */
export function evaluateDetection(
  complaints: Complaint[],
  currentSimTime: number,
  activeEpisodes: Map<string, ActiveEpisode> = new Map(),
  settings: DetectionSettings = DEFAULT_DETECTION_SETTINGS,
  baselines: BaselineMap = GLOBAL_BASELINES
): DetectionResult {
  const windowEnd = currentSimTime;
  const windowStart = currentSimTime - WINDOW_DURATION_MIN * 60 * 1000;
  const cooldownMs = settings.cooldownMin * 60 * 1000;

  // Filter complaints within sliding window that have arrived AI analysis
  // Per rule: "pending_ai" complaints are NOT counted in detection until analysis arrives.
  const windowComplaints = complaints.filter(
    (c) => c.ts >= windowStart && c.ts <= windowEnd && c.source !== "pending_ai" && c.analysis
  );

  // Group by (category, district)
  const keyComplaintsMap = new Map<string, Complaint[]>();
  let totalCompanyCount = windowComplaints.length;
  let unknownDistrictCount = 0;

  for (const comp of windowComplaints) {
    const analysis = comp.analysis!;
    const category = analysis.category;
    const district = analysis.district;

    if (district === "unknown") {
      unknownDistrictCount++;
    } else {
      const key = makeKey(category, district);
      if (!keyComplaintsMap.has(key)) {
        keyComplaintsMap.set(key, []);
      }
      keyComplaintsMap.get(key)!.push(comp);
    }
  }

  // Check company-wide fixed-threshold comparator rule
  let fixedThresholdAlert: DetectionResult["fixedThresholdAlert"] = undefined;
  if (totalCompanyCount >= settings.fixedThreshold) {
    fixedThresholdAlert = {
      totalCount: totalCompanyCount,
      threshold: settings.fixedThreshold,
      complaintIds: windowComplaints.map((c) => c.id),
    };
  }

  const updatedEpisodes = new Map<string, ActiveEpisode>(activeEpisodes);
  const newAlerts: Alert[] = [];
  const continuingEpisodes: DetectionResult["continuingEpisodes"] = [];

  // Prune expired episodes where cooldown has elapsed
  for (const [key, ep] of updatedEpisodes.entries()) {
    if (windowEnd - ep.lastTriggeredAt > cooldownMs) {
      updatedEpisodes.delete(key);
    }
  }

  // Evaluate each (category, district) group against statistical threshold
  for (const [keyStr, group] of keyComplaintsMap.entries()) {
    const sampleComp = group[0];
    const category = sampleComp.analysis!.category;
    const district = sampleComp.analysis!.district;

    const count = group.length;
    const baseline = baselines.get(keyStr) || {
      category,
      district,
      mean: 0,
      std: 1.0,
    };

    const mean = baseline.mean;
    const std = Math.max(1.0, baseline.std);
    const ruleThreshold = Math.max(settings.minCount, mean + settings.k * std);
    const zScore = (count - mean) / std;

    // Is this key currently exceeding its threshold?
    if (count >= ruleThreshold) {
      const existingEpisode = updatedEpisodes.get(keyStr);

      if (existingEpisode && windowEnd - existingEpisode.lastTriggeredAt <= cooldownMs) {
        // ONE ALERT PER EPISODE: attach new complaints to existing episode
        const prevCount = existingEpisode.complaintIds.size;
        const newIds: string[] = [];

        group.forEach((c) => {
          if (!existingEpisode.complaintIds.has(c.id)) {
            existingEpisode.complaintIds.add(c.id);
            newIds.push(c.id);
          }
        });

        existingEpisode.lastTriggeredAt = windowEnd;
        existingEpisode.peakCount = Math.max(existingEpisode.peakCount, count);

        continuingEpisodes.push({
          episode: existingEpisode,
          newComplaintIds: newIds,
          currentCount: count,
        });
      } else {
        // Create a new episode and new alert
        const alertId = `ALT-${windowEnd.toString(36).toUpperCase()}-${Math.floor(
          Math.random() * 1000
        )}`;
        const episodeId = `EP-${windowEnd.toString(36).toUpperCase()}-${Math.floor(
          Math.random() * 1000
        )}`;
        const incidentId = `INC-${windowEnd.toString(36).toUpperCase()}-${Math.floor(
          Math.random() * 1000
        )}`;

        const complaintIds = group.map((c) => c.id);

        const newAlert: Alert = {
          id: alertId,
          key: {
            category,
            district,
          },
          windowStart,
          windowEnd,
          count,
          baselineMean: mean,
          baselineStd: std,
          zScore,
          ruleThreshold,
          complaintIds,
        };

        newAlerts.push(newAlert);

        const newEpisode: ActiveEpisode = {
          episodeId,
          alertId,
          incidentId,
          category,
          district,
          firstTriggeredAt: windowEnd,
          lastTriggeredAt: windowEnd,
          peakCount: count,
          complaintIds: new Set(complaintIds),
        };

        updatedEpisodes.set(keyStr, newEpisode);
      }
    }
  }

  return {
    windowStart,
    windowEnd,
    totalCompanyCount,
    unknownDistrictCount,
    newAlerts,
    continuingEpisodes,
    updatedEpisodes,
    fixedThresholdAlert,
  };
}
