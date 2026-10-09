import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Complaint,
  Alert,
  Incident,
  District,
  CategoryId,
  Channel,
  ActivityEntry,
} from "../types";
import {
  DistrictTileMap,
} from "./DistrictTileMap";
import { IncidentFeed } from "./IncidentFeed";
import { ScenarioControl } from "./ScenarioControl";
import { SettingsDrawer } from "./SettingsDrawer";
import { IncidentDetailModal } from "./IncidentDetailModal";
import {
  DetectionSettings,
  DEFAULT_DETECTION_SETTINGS,
  evaluateDetection,
  ActiveEpisode,
} from "../engine/detection";
import { handleAlertIncident } from "../engine/incidents";
import {
  applyFixAndStartMonitoring,
  evaluateMonitoring,
} from "../engine/monitoring";
import {
  SCENARIOS,
  ScenarioDefinition,
  generateScenarioComplaints,
  GLOBAL_BASELINES,
  makeKey,
  BAKU_DISTRICTS,
  SeededRNG,
  buildSyntheticComplaint,
} from "../sim/generator";
import { SIM_START_TIME } from "../config";
import { classifyComplaint } from "../ai/classify";
import { getFromCache, computeCacheKey } from "../ai/gemini";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  Sliders,
  Layers,
  HelpCircle,
  Clock,
  Sparkles,
  Zap,
  Info,
  Radio,
  Lock,
} from "lucide-react";
import { CHANNEL_LABELS } from "../sectors/telecom";

export type AIMode = "live_ai" | "cached_ai" | "offline_fixture";

export interface LiveBoardProps {
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  aiMode: AIMode;
  pendingCount: number;
  setPendingCount: React.Dispatch<React.SetStateAction<number>>;
  incidents?: Incident[];
  setIncidents?: React.Dispatch<React.SetStateAction<Incident[]>>;
  alerts?: Alert[];
  setAlerts?: React.Dispatch<React.SetStateAction<Alert[]>>;
  simTime?: number;
  setSimTime?: React.Dispatch<React.SetStateAction<number>>;
  isRunning?: boolean;
  setIsRunning?: React.Dispatch<React.SetStateAction<boolean>>;
  speedMultiplier?: 1 | 10 | 30;
  setSpeedMultiplier?: React.Dispatch<React.SetStateAction<1 | 10 | 30>>;
  selectedIncident?: Incident | null;
  setSelectedIncident?: React.Dispatch<React.SetStateAction<Incident | null>>;
  onApplyFix?: (incident: Incident) => void;
}

export const LiveBoard: React.FC<LiveBoardProps> = ({
  complaints,
  setComplaints,
  aiMode,
  pendingCount,
  setPendingCount,
  incidents: propIncidents,
  setIncidents: propSetIncidents,
  alerts: propAlerts,
  setAlerts: propSetAlerts,
  simTime: propSimTime,
  setSimTime: propSetSimTime,
  isRunning: propIsRunning,
  setIsRunning: propSetIsRunning,
  speedMultiplier: propSpeedMultiplier,
  setSpeedMultiplier: propSetSpeedMultiplier,
  selectedIncident: propSelectedIncident,
  setSelectedIncident: propSetSelectedIncident,
  onApplyFix: propOnApplyFix,
}) => {
  // Simulated Clock State (lifted or fallback)
  const [internalSimTime, setInternalSimTime] = useState<number>(SIM_START_TIME);
  const simTime = propSimTime !== undefined ? propSimTime : internalSimTime;
  const setSimTime = propSetSimTime ?? setInternalSimTime;

  const [internalIsRunning, setInternalIsRunning] = useState<boolean>(false);
  const isRunning = propIsRunning !== undefined ? propIsRunning : internalIsRunning;
  const setIsRunning = propSetIsRunning ?? setInternalIsRunning;

  const [internalSpeed, setInternalSpeed] = useState<1 | 10 | 30>(1);
  const speedMultiplier = propSpeedMultiplier !== undefined ? propSpeedMultiplier : internalSpeed;
  const setSpeedMultiplier = propSetSpeedMultiplier ?? setInternalSpeed;

  // Detection & Incident State (lifted or fallback)
  const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>(
    DEFAULT_DETECTION_SETTINGS
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeEpisodes, setActiveEpisodes] = useState<Map<string, ActiveEpisode>>(
    new Map()
  );
  const [internalAlerts, setInternalAlerts] = useState<Alert[]>([]);
  const alerts = propAlerts !== undefined ? propAlerts : internalAlerts;
  const setAlerts = propSetAlerts ?? setInternalAlerts;

  const [internalIncidents, setInternalIncidents] = useState<Incident[]>([]);
  const incidents = propIncidents !== undefined ? propIncidents : internalIncidents;
  const setIncidents = propSetIncidents ?? setInternalIncidents;

  const [internalSelectedIncident, setInternalSelectedIncident] = useState<Incident | null>(null);
  const selectedIncident = propSelectedIncident !== undefined ? propSelectedIncident : internalSelectedIncident;
  const setSelectedIncident = propSetSelectedIncident ?? setInternalSelectedIncident;

  // Track fixed keys and their deployment timestamps
  const [fixedKeys, setFixedKeys] = useState<Map<string, number>>(new Map());

  // District filter
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Background Normal Traffic Generator RNG
  const rngRef = useRef<SeededRNG>(new SeededRNG(9999));
  const queueProcessingRef = useRef<boolean>(false);

  // Map complaints by ID for quick lookup
  const complaintsMap = useMemo(() => {
    const map = new Map<string, Complaint>();
    complaints.forEach((c) => map.set(c.id, c));
    return map;
  }, [complaints]);

  // Periodic Clock Ticker
  useEffect(() => {
    if (!isRunning) return;

    const realIntervalMs = 1000;
    const interval = setInterval(() => {
      setSimTime((prevTime) => {
        // Advanced simulated time by realIntervalMs * speedMultiplier
        const advancedMs = realIntervalMs * speedMultiplier;
        const newSimTime = prevTime + advancedMs;

        // Generate normal background traffic (~30 complaints per 15 min = 2 complaints/min)
        // Probabilistic arrival per second
        const expectedPerSecond = (30 / (15 * 60)) * (advancedMs / 1000);
        if (rngRef.current.next() < expectedPerSecond) {
          const categories: CategoryId[] = [
            "internet_outage",
            "internet_slow_quality",
            "fixed_phone_outage",
            "mobile_service_quality",
            "service_center_conduct",
            "tariff_billing",
            "number_portability",
          ];
          const cat = categories[rngRef.current.nextInt(0, categories.length - 1)];
          const dist = BAKU_DISTRICTS[rngRef.current.nextInt(0, BAKU_DISTRICTS.length - 1)];
          const langs: ("az" | "ru" | "en" | "mixed")[] = ["az", "ru", "en", "mixed"];
          const lang = langs[rngRef.current.nextInt(0, langs.length - 1)];

          const newComp = buildSyntheticComplaint(
            `NORM-${newSimTime.toString(36).toUpperCase()}-${rngRef.current.nextInt(10, 99)}`,
            newSimTime,
            cat,
            dist,
            "app_chat",
            lang,
            rngRef.current.nextInt(0, 9),
            aiMode === "offline_fixture" ? "offline_fixture" : "pending_ai"
          );

          setComplaints((prev) => [newComp, ...prev]);
          if (aiMode !== "offline_fixture") {
            setPendingCount((c) => c + 1);
          }
        }

        return newSimTime;
      });
    }, realIntervalMs);

    return () => clearInterval(interval);
  }, [isRunning, speedMultiplier, aiMode, setComplaints, setPendingCount]);

  // Async Background Processor for pending_ai complaints (Non-blocking queue)
  useEffect(() => {
    const pendingList = complaints.filter(
      (c) => c.source === "pending_ai"
    );

    if (pendingList.length === 0 || queueProcessingRef.current) return;

    if (aiMode === "offline_fixture") {
      // Immediate resolution using fixture labels
      setComplaints((prev) =>
        prev.map((c) => {
          if (c.source === "pending_ai") {
            return {
              ...c,
              source: "offline_fixture",
            };
          }
          return c;
        })
      );
      setPendingCount(0);
      return;
    }

    // Process pending complaints asynchronously (max 4 concurrency handled by classifyComplaint)
    queueProcessingRef.current = true;
    const toProcess = pendingList.slice(0, 8); // take batch

    Promise.all(
      toProcess.map(async (c) => {
        try {
          if (aiMode === "cached_ai") {
            // Check cache
            const cacheKey = computeCacheKey(c.maskedText);
            const cached = getFromCache(cacheKey);
            if (cached) {
              const res = await classifyComplaint(c.maskedText, { bypassCache: false });
              return {
                id: c.id,
                analysis: res.analysis,
                source: "cached_ai" as const,
                latencyMs: res.latencyMs,
                tokens: res.tokens,
              };
            }
          }

          // Live AI classification
          const res = await classifyComplaint(c.maskedText, { bypassCache: false });
          return {
            id: c.id,
            analysis: res.analysis,
            source: res.source,
            latencyMs: res.latencyMs,
            tokens: res.tokens,
            errorMessage: res.errorMessage,
          };
        } catch (err: any) {
          return {
            id: c.id,
            source: "ai_failed" as const,
            errorMessage: err.message || "Classification failed",
          };
        }
      })
    )
      .then((results) => {
        setComplaints((prev) =>
          prev.map((c) => {
            const found = results.find((r) => r.id === c.id);
            if (found) {
              return {
                ...c,
                analysis: found.analysis || c.analysis,
                source: found.source,
                latencyMs: found.latencyMs,
                tokens: found.tokens,
                errorMessage: found.errorMessage,
              };
            }
            return c;
          })
        );
        setPendingCount((cnt) => Math.max(0, cnt - results.length));
      })
      .finally(() => {
        queueProcessingRef.current = false;
      });
  }, [complaints, aiMode, setComplaints, setPendingCount]);

  // Run Detection Engine whenever simTime or complaints change
  useEffect(() => {
    const detResult = evaluateDetection(
      complaints,
      simTime,
      activeEpisodes,
      detectionSettings,
      GLOBAL_BASELINES
    );

    // Update active episodes map
    setActiveEpisodes(detResult.updatedEpisodes);

    // Process new alerts and create incidents
    if (detResult.newAlerts.length > 0) {
      setAlerts((prev) => [...detResult.newAlerts, ...prev]);

      detResult.newAlerts.forEach((alt) => {
        const episodeKey = makeKey(alt.key.category, alt.key.district);
        const ep = detResult.updatedEpisodes.get(episodeKey);

        const incRes = handleAlertIncident(
          alt,
          complaintsMap,
          incidents,
          simTime,
          ep?.incidentId
        );

        setIncidents(incRes.incidents);
      });
    }

    // Process continuing episodes (attach newly arrived complaints)
    if (detResult.continuingEpisodes.length > 0) {
      detResult.continuingEpisodes.forEach((cont) => {
        const fakeAlert: Alert = {
          id: cont.episode.alertId,
          key: {
            category: cont.episode.category,
            district: cont.episode.district,
          },
          windowStart: simTime - 15 * 60 * 1000,
          windowEnd: simTime,
          count: cont.currentCount,
          baselineMean: 0,
          baselineStd: 1,
          zScore: 3,
          ruleThreshold: 8,
          complaintIds: Array.from(cont.episode.complaintIds),
        };

        const incRes = handleAlertIncident(
          fakeAlert,
          complaintsMap,
          incidents,
          simTime,
          cont.episode.incidentId
        );

        setIncidents(incRes.incidents);
      });
    }
  }, [simTime, complaints, detectionSettings]);

  // District 15-Minute Counts & Anomaly State Calculation (Matrix)
  const districtCounts = useMemo(() => {
    const map = new Map<
      District,
      {
        count: number;
        maxZScore: number;
        topCategory?: CategoryId;
        isAlert: boolean;
        isWatching: boolean;
        isCritical: boolean;
      }
    >();

    const windowStart = simTime - 15 * 60 * 1000;
    const windowEnd = simTime;

    // Filter valid analyzed complaints in window
    const recent = complaints.filter(
      (c) => c.ts >= windowStart && c.ts <= windowEnd && c.source !== "pending_ai" && c.analysis
    );

    // Count per district & find max z-score
    recent.forEach((c) => {
      const dist = c.analysis!.district;
      if (dist === "unknown") return;

      const curr = map.get(dist) || {
        count: 0,
        maxZScore: 0,
        isAlert: false,
        isWatching: false,
        isCritical: false,
      };

      curr.count++;

      // Compute Z-score for this category in this district
      const base = GLOBAL_BASELINES.get(makeKey(c.analysis!.category, dist));
      if (base) {
        const z = (curr.count - base.mean) / Math.max(1, base.std);
        curr.maxZScore = Math.max(curr.maxZScore, z);
      }

      map.set(dist, curr);
    });

    // Check alerts and incidents for critical / alert statuses
    alerts.forEach((alt) => {
      if (alt.windowEnd >= windowStart && alt.key.district !== "unknown") {
        const curr = map.get(alt.key.district) || {
          count: alt.count,
          maxZScore: alt.zScore,
          isAlert: true,
          isWatching: false,
          isCritical: false,
        };
        curr.isAlert = true;
        curr.maxZScore = Math.max(curr.maxZScore, alt.zScore);
        if (alt.zScore >= 5 || alt.count >= 25) {
          curr.isCritical = true;
        }
        map.set(alt.key.district, curr);
      }
    });

    return map;
  }, [complaints, simTime, alerts]);

  // Calculate unknown district complaints in current 15m window
  const unknownDistrictCount = useMemo(() => {
    const windowStart = simTime - 15 * 60 * 1000;
    return complaints.filter(
      (c) =>
        c.ts >= windowStart &&
        c.ts <= simTime &&
        c.source !== "pending_ai" &&
        c.analysis?.district === "unknown"
    ).length;
  }, [complaints, simTime]);

  // Post-fix Monitoring Evaluator: checks every time simTime changes
  useEffect(() => {
    incidents.forEach((inc) => {
      if (inc.status !== "Monitoring") return;
      const key = makeKey(inc.category, inc.district);
      const base = GLOBAL_BASELINES.get(key) || { mean: 1.2, std: 1.0 };
      const current15mCount = complaints.filter(
        (c) =>
          c.ts >= simTime - 15 * 60 * 1000 &&
          c.ts <= simTime &&
          c.source !== "pending_ai" &&
          c.analysis &&
          makeKey(c.analysis.category, c.analysis.district) === key
      ).length;

      const alertThreshold = Math.max(
        detectionSettings.minCount,
        base.mean + detectionSettings.k * base.std
      );

      const evalRes = evaluateMonitoring(
        inc,
        current15mCount,
        base.mean,
        base.std,
        alertThreshold,
        simTime,
        inc.monitoringBelowSince ?? inc.fixAppliedAt ?? null
      );

      // (b) Resurgence during Monitoring -> Reopened
      if (evalRes.shouldReopen) {
        const reopenActivity: ActivityEntry = {
          ts: simTime,
          actor: "system",
          action: "Incident Reopened",
          details: `Complaints rose above alert condition during Monitoring (${current15mCount} >= ${alertThreshold}). Reopened for investigation.`,
        };
        const updatedInc: Incident = {
          ...inc,
          status: "Reopened",
          activityLog: [...inc.activityLog, reopenActivity],
        };
        setIncidents((prev) =>
          prev.map((i) => (i.id === inc.id ? updatedInc : i))
        );
        if (selectedIncident?.id === inc.id) {
          setSelectedIncident(updatedInc);
        }
      } else if (
        evalRes.isBelowThreshold &&
        !inc.monitoringBelowSince &&
        inc.fixAppliedAt
      ) {
        const updatedInc: Incident = {
          ...inc,
          monitoringBelowSince: simTime,
        };
        setIncidents((prev) =>
          prev.map((i) => (i.id === inc.id ? updatedInc : i))
        );
        if (selectedIncident?.id === inc.id) {
          setSelectedIncident(updatedInc);
        }
      }
    });
  }, [simTime, incidents, complaints, detectionSettings]);

  const handleApplyFix = (incident: Incident) => {
    if (propOnApplyFix) {
      propOnApplyFix(incident);
      return;
    }
    const updated = applyFixAndStartMonitoring(incident, simTime);
    setIncidents((prev) =>
      prev.map((i) => (i.id === incident.id ? updated : i))
    );
    setSelectedIncident(updated);
    const key = makeKey(incident.category, incident.district);
    setFixedKeys((prev) => new Map(prev).set(key, simTime));

    // Curatil future scenario spike complaints for that key so volume drops to normal rate
    setComplaints((prev) => {
      return prev.filter((c) => {
        if (!c.analysis) return true;
        const cKey = makeKey(c.analysis.category, c.analysis.district);
        return !(cKey === key && c.ts > simTime);
      });
    });
  };

  const handleInjectScenario = (scenario: ScenarioDefinition) => {
    // Generate complaints seeded starting from currentSimTime
    const newBatch = generateScenarioComplaints(
      scenario,
      simTime,
      Date.now()
    );

    // Set source according to current AI mode
    const preparedBatch = newBatch.map((c) => ({
      ...c,
      source: aiMode === "offline_fixture" ? ("offline_fixture" as const) : ("pending_ai" as const),
    }));

    setComplaints((prev) => [...preparedBatch, ...prev].sort((a, b) => b.ts - a.ts));
    if (aiMode !== "offline_fixture") {
      setPendingCount((cnt) => cnt + preparedBatch.length);
    }
  };

  const handleResetDemo = () => {
    if (confirm("Reset simulation clock to 08:00 and clear active alerts & incidents?")) {
      setSimTime(SIM_START_TIME);
      setIsRunning(false);
      setAlerts([]);
      setIncidents([]);
      setActiveEpisodes(new Map());
      setComplaints([]);
      setPendingCount(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Command Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Clock & Speed Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-tight">
                  Simulated Clock
                </span>
                <span className="font-mono text-sm font-bold text-cyan-200">
                  {new Date(simTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  isRunning
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Start Normal Traffic
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetDemo}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Reset simulation to 08:00"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reset Demo
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 px-1 font-semibold">Speed:</span>
              {([1, 10, 30] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition-colors ${
                    speedMultiplier === spd
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  x{spd}
                </button>
              ))}
            </div>
          </div>

          {/* Unknown District Counter & Settings Drawer Button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300"
              title="Complaints with 'unknown' district are excluded from district alerts but counted in company-wide fixed threshold."
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Unknown District (15m):</span>
              <strong className="font-mono text-amber-300 font-bold">
                {unknownDistrictCount}
              </strong>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Settings (K={detectionSettings.k}&sigma;, Min={detectionSettings.minCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schematic District Matrix (15 Tiles) */}
      <DistrictTileMap
        selectedDistrict={selectedDistrict}
        onSelectDistrict={setSelectedDistrict}
        districtCounts={districtCounts}
      />

      {/* Scenario Injection Control Library */}
      <ScenarioControl
        currentSimTime={simTime}
        onInjectScenario={handleInjectScenario}
      />

      {/* Incidents & Statistical Anomaly Alerts Feed */}
      <IncidentFeed
        incidents={incidents}
        alerts={alerts}
        complaintsMap={complaintsMap}
        selectedDistrict={selectedDistrict}
        onInspectIncident={(inc) => setSelectedIncident(inc)}
      />

      {/* Live Stream of Incoming Complaints */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              Live Arriving Complaint Stream
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological feed with real-time source badges ({complaints.length} in buffer)
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
              {pendingCount} Pending AI Classification
            </span>
          )}
        </div>

        {complaints.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Stream is empty. Click "Start Normal Traffic" or inject an incident scenario above.
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-72 divide-y divide-slate-100">
            {complaints.slice(0, 20).map((c) => (
              <div key={c.id} className="pt-2 text-xs flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {c.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(c.ts).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {CHANNEL_LABELS[c.channel]}
                    </span>
                    {c.analysis?.district && (
                      <span className="text-[10px] font-semibold text-slate-700">
                        Dist: {c.analysis.district}
                      </span>
                    )}
                    {c.hasMaskedData && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        <Lock className="w-2.5 h-2.5" /> masked
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 font-sans text-xs line-clamp-1">{c.maskedText}</p>
                </div>

                {/* Source Badge */}
                <div className="shrink-0 text-right">
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
                  {c.source === "offline_fixture" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">
                      Offline fixture labels, no AI used
                    </span>
                  )}
                  {c.source === "pending_ai" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      pending_ai
                    </span>
                  )}
                  {c.source === "ai_failed" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                      ai_failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={detectionSettings}
        onSaveSettings={setDetectionSettings}
      />

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          alert={alerts.find((a) => a.id === selectedIncident.alertId)}
          complaintsMap={complaintsMap}
          currentSimTime={simTime}
          onUpdateIncident={(updated) => {
            setIncidents((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
            setSelectedIncident(updated);
          }}
          onApplyFix={handleApplyFix}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
};
