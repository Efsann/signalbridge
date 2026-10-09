/**
 * Simulation Generator & Baseline Calculator for SignalBridge
 * Computes 14-day synthetic baseline statistics for (category, district) keys
 * and produces reproducible scenario streams.
 */

import { CategoryId, District, Complaint, Channel, Analysis } from "../types";
import { getFixtureTemplate } from "./fixtures";
import { CHANNELS } from "../sectors/telecom";
import { maskPII } from "../lib/mask";

// Seeded Random Number Generator (Mulberry32) for deterministic reproducibility
export class SeededRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > L && k < 1000);
    return k - 1;
  }
}

// Category Weights (Normal traffic assumptions, sum = 100)
export const CATEGORY_WEIGHTS: Record<CategoryId, number> = {
  internet_outage: 30,
  internet_slow_quality: 22,
  fixed_phone_outage: 15,
  mobile_service_quality: 13,
  service_center_conduct: 10,
  tariff_billing: 7,
  number_portability: 3,
  other_unclear: 0,
};

// 12 Baku Districts: 55% total (~4.5833% each)
export const BAKU_DISTRICTS: District[] = [
  "Binəqədi",
  "Nərimanov",
  "Nəsimi",
  "Nizami",
  "Pirallahı",
  "Sabunçu",
  "Səbail",
  "Suraxanı",
  "Xətai",
  "Xəzər",
  "Yasamal",
  "Qaradağ",
];

// District Weights (Normal traffic assumptions, sum = 100)
export const DISTRICT_WEIGHTS: Record<District, number> = {
  Binəqədi: 55 / 12,
  Nərimanov: 55 / 12,
  Nəsimi: 55 / 12,
  Nizami: 55 / 12,
  Pirallahı: 55 / 12,
  Sabunçu: 55 / 12,
  Səbail: 55 / 12,
  Suraxanı: 55 / 12,
  Xətai: 55 / 12,
  Xəzər: 55 / 12,
  Yasamal: 55 / 12,
  Qaradağ: 55 / 12,
  "Abşeron–Xırdalan": 5,
  Saatlı: 6,
  "Other regions": 34,
  unknown: 0, // Excluded from district alerts but counted company-wide
};

export interface KeyBaseline {
  category: CategoryId;
  district: District;
  mean: number;
  std: number;
}

export type BaselineMap = Map<string, KeyBaseline>;

/**
 * Builds composite string key for category and district
 */
export function makeKey(category: CategoryId, district: District): string {
  return `${category}::${district}`;
}

export function parseKey(keyStr: string): { category: CategoryId; district: District } {
  const [category, district] = keyStr.split("::") as [CategoryId, District];
  return { category, district };
}

/**
 * Generates 14 simulated days of 15-minute counts (14 * 24 * 4 = 1,344 intervals)
 * with a seeded RNG to establish baseline mean and std per key.
 * Expected company-wide volume is ~30 complaints per 15 minutes.
 */
export function computeHistoricalBaselines(seed: number = 20261009): BaselineMap {
  const rng = new SeededRNG(seed);
  const INTERVALS = 14 * 24 * 4; // 1,344 15-minute intervals
  const COMPANY_LAMBDA_PER_15MIN = 30;

  // Initialize history accumulation arrays
  const historyCounts: Map<string, number[]> = new Map();

  const categories = Object.keys(CATEGORY_WEIGHTS) as CategoryId[];
  const districts = Object.keys(DISTRICT_WEIGHTS) as District[];

  for (const cat of categories) {
    for (const dist of districts) {
      historyCounts.set(makeKey(cat, dist), new Array(INTERVALS).fill(0));
    }
  }

  // Precompute probabilities
  const keyProbabilities = new Map<string, number>();
  for (const cat of categories) {
    const cWeight = CATEGORY_WEIGHTS[cat] / 100;
    for (const dist of districts) {
      const dWeight = DISTRICT_WEIGHTS[dist] / 100;
      keyProbabilities.set(makeKey(cat, dist), cWeight * dWeight);
    }
  }

  // Generate counts for each 15-minute slot across 14 days
  for (let slot = 0; slot < INTERVALS; slot++) {
    // Total complaints in this 15-min window follows Poisson(30)
    const totalSlotComplaints = rng.poisson(COMPANY_LAMBDA_PER_15MIN);

    for (let c = 0; c < totalSlotComplaints; c++) {
      // Sample category
      const rCat = rng.next() * 100;
      let accumC = 0;
      let chosenCat: CategoryId = "internet_outage";
      for (const cat of categories) {
        accumC += CATEGORY_WEIGHTS[cat];
        if (rCat <= accumC) {
          chosenCat = cat;
          break;
        }
      }

      // Sample district
      const rDist = rng.next() * 100;
      let accumD = 0;
      let chosenDist: District = "Binəqədi";
      for (const dist of districts) {
        accumD += DISTRICT_WEIGHTS[dist];
        if (rDist <= accumD) {
          chosenDist = dist;
          break;
        }
      }

      const key = makeKey(chosenCat, chosenDist);
      const arr = historyCounts.get(key);
      if (arr) {
        arr[slot]++;
      }
    }
  }

  // Calculate mean and std for each key
  const baselines: BaselineMap = new Map();

  for (const cat of categories) {
    for (const dist of districts) {
      const key = makeKey(cat, dist);
      const counts = historyCounts.get(key) || [];
      const sum = counts.reduce((acc, v) => acc + v, 0);
      const mean = sum / INTERVALS;

      let varianceSum = 0;
      for (let i = 0; i < INTERVALS; i++) {
        varianceSum += (counts[i] - mean) ** 2;
      }
      const rawStd = Math.sqrt(varianceSum / (INTERVALS - 1));
      // Floor standard deviation at 1 as required by specification
      const std = Math.max(1.0, rawStd);

      baselines.set(key, {
        category: cat,
        district: dist,
        mean,
        std,
      });
    }
  }

  return baselines;
}

// Global cached baselines computed once
export const GLOBAL_BASELINES: BaselineMap = computeHistoricalBaselines();

export interface ScenarioDefinition {
  id: string;
  code: "S1" | "S2" | "S3" | "S4" | "S5";
  title: string;
  description: string;
  targetCategory: CategoryId;
  targetDistrict: District | "all";
  extraCount: number;
  durationMinutes: number;
  expectedOutcome: "ALERT" | "NO_ALERT";
  expectedAlertDescription: string;
}

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  S1: {
    id: "S1",
    code: "S1",
    title: "S1: Binəqədi Fiber Cut Ramp",
    description: "internet_outage in Binəqədi, 28 extra complaints over 15 minutes with a progressive ramp.",
    targetCategory: "internet_outage",
    targetDistrict: "Binəqədi",
    extraCount: 28,
    durationMinutes: 15,
    expectedOutcome: "ALERT",
    expectedAlertDescription: "Spike crosses threshold (K=3, Min=8) creating a High/Critical incident.",
  },
  S2: {
    id: "S2",
    code: "S2",
    title: "S2: Səbail Mobile Coverage Degraded",
    description: "mobile_service_quality in Səbail, 22 extra complaints in 15 minutes.",
    targetCategory: "mobile_service_quality",
    targetDistrict: "Səbail",
    extraCount: 22,
    durationMinutes: 15,
    expectedOutcome: "ALERT",
    expectedAlertDescription: "Concentrated spike triggers mobile quality alert and NOC routing.",
  },
  S3: {
    id: "S3",
    code: "S3",
    title: "S3: Xətai Fixed Phone Cable Snapped",
    description: "fixed_phone_outage in Xətai, 20 extra complaints in 15 minutes.",
    targetCategory: "fixed_phone_outage",
    targetDistrict: "Xətai",
    extraCount: 20,
    durationMinutes: 15,
    expectedOutcome: "ALERT",
    expectedAlertDescription: "Triggers incident routed directly to Field Infrastructure.",
  },
  S4: {
    id: "S4",
    code: "S4",
    title: "S4: Tariff Billing Rise (+40% Diffuse)",
    description: "tariff_billing rises 40% spread over all districts for 30 minutes.",
    targetCategory: "tariff_billing",
    targetDistrict: "all",
    extraCount: 16,
    durationMinutes: 30,
    expectedOutcome: "NO_ALERT",
    expectedAlertDescription: "Expected: NO alert (diffuse across districts, fails single-district threshold).",
  },
  S5: {
    id: "S5",
    code: "S5",
    title: "S5: Number Portability Minor Trickle",
    description: "number_portability rises by a handful of complaints (4 complaints).",
    targetCategory: "number_portability",
    targetDistrict: "Yasamal",
    extraCount: 4,
    durationMinutes: 15,
    expectedOutcome: "NO_ALERT",
    expectedAlertDescription: "Expected: NO alert (sub-threshold count < MIN_COUNT).",
  },
};

/**
 * Creates a synthetic Complaint object from a fixture template
 */
export function buildSyntheticComplaint(
  id: string,
  timestamp: number,
  category: CategoryId,
  district: District,
  channel: Channel,
  language: "az" | "ru" | "en" | "mixed",
  templateIndex: number,
  source: "pending_ai" | "cached_ai" | "offline_fixture" | "live_ai" = "offline_fixture"
): Complaint {
  const template = getFixtureTemplate(category, language, templateIndex);
  let rawText = template.template;

  // If template doesn't specify district but district is chosen, optionally interpolate
  if (district !== "unknown" && !rawText.includes(district)) {
    // Keep text as-is or replace placeholder
  }

  const maskResult = maskPII(rawText);

  const analysis: Analysis = {
    language,
    category,
    issue_signature: template.issue_signature,
    district,
    severity: template.severity,
    summary: template.summary,
    evidence_phrases: template.evidence_phrases,
    confidence: 0.94,
    needs_manual_review: category === "other_unclear",
    manual_review_reason: category === "other_unclear" ? "Unclear complaint from synthetic generator" : "",
    contains_instructions_to_system: false,
  };

  return {
    id,
    ts: timestamp,
    channel,
    rawText,
    maskedText: maskResult.maskedText,
    analysis,
    source,
    groundingWarnings: 0,
    hasMaskedData: maskResult.hasMaskedData,
    maskDetails: maskResult.counts,
  };
}

/**
 * Generates an array of complaints for a specific scenario starting at baseTimestamp
 */
export function generateScenarioComplaints(
  scenario: ScenarioDefinition,
  baseTimestamp: number,
  seed: number = 777
): Complaint[] {
  const rng = new SeededRNG(seed);
  const complaints: Complaint[] = [];
  const languages: ("az" | "ru" | "en" | "mixed")[] = ["az", "ru", "en", "mixed"];

  const count = scenario.extraCount;
  const durationMs = scenario.durationMinutes * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Ramp distribution: for S1, later complaints are clustered closer together
    let progressRatio = i / Math.max(1, count - 1);
    if (scenario.code === "S1") {
      // Quadratic ramp
      progressRatio = Math.pow(progressRatio, 1.4);
    }
    const offsetMs = Math.round(progressRatio * durationMs) + rng.nextInt(-30000, 30000);
    const ts = baseTimestamp + Math.max(0, offsetMs);

    const lang = languages[rng.nextInt(0, languages.length - 1)];
    const channel = CHANNELS[rng.nextInt(0, CHANNELS.length - 1)];

    let district: District = scenario.targetDistrict === "all"
      ? BAKU_DISTRICTS[rng.nextInt(0, BAKU_DISTRICTS.length - 1)]
      : scenario.targetDistrict;

    const id = `SCN-${scenario.code}-${i + 1}-${rng.nextInt(100, 999)}`;
    const comp = buildSyntheticComplaint(
      id,
      ts,
      scenario.targetCategory,
      district,
      channel,
      lang,
      i,
      "pending_ai"
    );
    complaints.push(comp);
  }

  // Sort chronologically
  return complaints.sort((a, b) => a.ts - b.ts);
}

/**
 * Generates 10 similar complaints for "Inject similar complaints" on the Submit screen
 */
export function generateSimilarComplaints(
  category: CategoryId,
  district: District,
  currentSimTime: number
): Complaint[] {
  const complaints: Complaint[] = [];
  const languages: ("az" | "ru" | "en" | "mixed")[] = ["az", "az", "ru", "mixed", "en"];

  for (let i = 0; i < 10; i++) {
    const lang = languages[i % languages.length];
    const channel = CHANNELS[i % CHANNELS.length];
    const offsetSeconds = Math.floor(i * 45) - 300; // staggered over the past 5 minutes
    const ts = currentSimTime + offsetSeconds * 1000;
    const id = `SIM-${Date.now().toString(36).toUpperCase()}-${i + 1}`;

    const comp = buildSyntheticComplaint(
      id,
      ts,
      category,
      district,
      channel,
      lang,
      i,
      "pending_ai"
    );
    complaints.push(comp);
  }

  return complaints;
}
