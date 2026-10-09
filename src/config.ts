/**
 * SignalBridge Configuration
 * Target: Fictional telecom operator "DemoTel" in Baku, Azerbaijan
 */

export const OPERATOR_NAME = "DemoTel";
export const OPERATOR_LOCATION = "Baku, Azerbaijan";

// Gemini Model Configuration
export const GEMINI_MODEL = "gemini-3.8-flash";
export const PROMPT_VERSION = "v1.0.0";

// Parallelism & Timeouts
export const MAX_PARALLEL_CALLS = 4;
export const API_TIMEOUT_MS = 20_000; // 20 seconds

// Pricing configuration
// Price constants are 0 by default with note: "Enter current published prices to see cost"
export const INPUT_TOKEN_PRICE_PER_MILLION = 0; // Enter current published prices to see cost
export const OUTPUT_TOKEN_PRICE_PER_MILLION = 0; // Enter current published prices to see cost
export const PRICING_NOTE = "Enter current published prices to see cost (currently set to $0.00/1M tokens)";

// Stage 2 Detection Parameters (Defaults)
export const DEFAULT_MIN_COUNT = 8;
export const DEFAULT_K = 3.0;
export const DEFAULT_FIXED_THRESHOLD = 40;
export const DEFAULT_COOLDOWN_MIN = 15;
export const WINDOW_DURATION_MIN = 15;
export const BUCKET_DURATION_MIN = 5;

// Priority Heuristics Parameters
export const CRITICAL_CATEGORIES: string[] = []; // Empty by default per specification
export const HIGH_PRIORITY_ZSCORE = 5.0;
export const HIGH_PRIORITY_COUNT = 25;
export const HIGH_PRIORITY_AVG_SEVERITY = 2.5;

// Simulation Clock
export const SIM_START_TIME = new Date("2026-10-09T08:00:00Z").getTime();

