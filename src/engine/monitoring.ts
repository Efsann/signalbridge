/**
 * Post-Fix Monitoring Engine for SignalBridge (Stage 3)
 * Tracks incident recovery after "Action Taken" and "Apply fix (demo)".
 * Features:
 * - Records actionTakenAt and monitoringStartedAt
 * - Evaluates 30-minute quiet period (count < mean + std) for auto-suggested resolution
 * - Detects resurgence (count >= alertThreshold) and triggers Reopened
 * - Computes bucketed counts for before/after recovery sparkline
 */

import { Incident, Complaint, ActivityEntry } from "../types";
import { transitionIncidentStatus } from "./incidents";

export interface MonitoringStatusEvaluation {
  incident: Incident;
  current15mCount: number;
  normalThreshold: number; // mean + std
  alertThreshold: number;
  isBelowThreshold: boolean;
  minutesBelowThreshold: number;
  canAutoResolve: boolean;
  shouldReopen: boolean;
}

export interface SparklinePoint {
  timeStr: string;
  count: number;
  isAfterFix: boolean;
  timestamp: number;
}

/**
 * Evaluates current monitoring state for an incident in "Monitoring" status.
 * Auto-suggests Resolved once 15-minute count stays below mean + std for 30 simulated minutes.
 * If count rises above alert condition again, flags shouldReopen.
 */
export function evaluateMonitoring(
  incident: Incident,
  current15mCount: number,
  baselineMean: number,
  baselineStd: number,
  alertThreshold: number,
  currentSimTime: number,
  monitoringBelowSince: number | null
): MonitoringStatusEvaluation {
  const normalThreshold = baselineMean + baselineStd;
  const isBelow = current15mCount <= normalThreshold;
  const isResurgent = current15mCount >= alertThreshold;

  let minutesBelow = 0;
  if (monitoringBelowSince && isBelow) {
    minutesBelow = Math.floor((currentSimTime - monitoringBelowSince) / (60 * 1000));
  }

  const canAutoResolve = isBelow && minutesBelow >= 30;
  const shouldReopen = isResurgent && incident.status === "Monitoring";

  return {
    incident,
    current15mCount,
    normalThreshold,
    alertThreshold,
    isBelowThreshold: isBelow,
    minutesBelowThreshold: minutesBelow,
    canAutoResolve,
    shouldReopen,
  };
}

/**
 * Transitions incident to "Monitoring" upon applying fix (demo).
 */
export function applyFixAndStartMonitoring(
  incident: Incident,
  currentSimTime: number,
  actor: "system" | "department" | "analyst" = "department"
): Incident {
  const fixActivity: ActivityEntry = {
    ts: currentSimTime,
    actor,
    action: "Operational fix deployed (demo)",
    details: "Field crew / NOC deployed corrective action. Transitioned to post-fix Monitoring.",
  };

  const updatedIncident: Incident = {
    ...incident,
    status: "Monitoring",
    fixAppliedAt: currentSimTime,
    monitoringBelowSince: currentSimTime,
    activityLog: [...incident.activityLog, fixActivity],
  };

  return updatedIncident;
}

/**
 * Computes 5-minute bucket data for before/after sparkline across the last 2 simulated hours.
 */
export function computeMonitoringSparkline(
  linkedComplaints: Complaint[],
  fixTimestamp: number | null,
  currentSimTime: number
): { points: SparklinePoint[]; baselineMeanBand: number; thresholdBand: number } {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const startTime = currentSimTime - twoHoursMs;
  const bucketDurationMs = 5 * 60 * 1000; // 5 minutes

  const buckets: SparklinePoint[] = [];

  for (let t = startTime; t <= currentSimTime; t += bucketDurationMs) {
    const bucketEnd = t + bucketDurationMs;
    const bucketComplaints = linkedComplaints.filter(
      (c) => c.ts >= t && c.ts < bucketEnd
    );

    const isAfter = fixTimestamp !== null ? t >= fixTimestamp : false;
    const d = new Date(t);
    const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    buckets.push({
      timeStr,
      count: bucketComplaints.length,
      isAfterFix: isAfter,
      timestamp: t,
    });
  }

  return {
    points: buckets,
    baselineMeanBand: 1.5,
    thresholdBand: 8.0,
  };
}
