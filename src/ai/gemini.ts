/**
 * Gemini SDK Client & Reliability Layer
 * Features:
 * - Official @google/genai SDK
 * - Max 4 parallel calls concurrency limiter
 * - Exponential backoff on 429 and 5xx
 * - 20s request timeout
 * - localStorage cache keyed by hash(maskedText, GEMINI_MODEL, PROMPT_VERSION)
 * - Telemetry tracking (live calls, tokens, median and slowest latency)
 */

import { GoogleGenAI } from "@google/genai";
import {
  GEMINI_MODEL,
  PROMPT_VERSION,
  MAX_PARALLEL_CALLS,
  API_TIMEOUT_MS,
  INPUT_TOKEN_PRICE_PER_MILLION,
  OUTPUT_TOKEN_PRICE_PER_MILLION,
} from "../config";

// Telemetry State
export interface GeminiTelemetry {
  liveCalls: number;
  cachedHits: number;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  latencies: number[];
}

const TELEMETRY_STORAGE_KEY = "signalbridge_gemini_telemetry";

function loadStoredTelemetry(): GeminiTelemetry {
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        liveCalls: Number(parsed.liveCalls) || 0,
        cachedHits: Number(parsed.cachedHits) || 0,
        promptTokens: Number(parsed.promptTokens) || 0,
        candidatesTokens: Number(parsed.candidatesTokens) || 0,
        totalTokens: Number(parsed.totalTokens) || 0,
        latencies: Array.isArray(parsed.latencies) ? parsed.latencies : [],
      };
    }
  } catch {
    // ignore
  }
  return {
    liveCalls: 0,
    cachedHits: 0,
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    latencies: [],
  };
}

let currentTelemetry: GeminiTelemetry = loadStoredTelemetry();
const telemetryListeners = new Set<(telemetry: GeminiTelemetry) => void>();

function notifyTelemetryUpdate() {
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(currentTelemetry));
  } catch {
    // ignore quota errors
  }
  telemetryListeners.forEach((fn) => fn({ ...currentTelemetry }));
}

export function subscribeTelemetry(listener: (t: GeminiTelemetry) => void): () => void {
  telemetryListeners.add(listener);
  listener({ ...currentTelemetry });
  return () => telemetryListeners.delete(listener);
}

export function getTelemetry(): GeminiTelemetry {
  return { ...currentTelemetry };
}

export function resetTelemetry(): void {
  currentTelemetry = {
    liveCalls: 0,
    cachedHits: 0,
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    latencies: [],
  };
  notifyTelemetryUpdate();
}

/**
 * Concurrency Limiter: Max 4 concurrent calls
 */
class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

const limiter = new ConcurrencyLimiter(MAX_PARALLEL_CALLS);

/**
 * Deterministic hash function for cache key
 */
export function computeCacheKey(maskedText: string): string {
  const input = `${GEMINI_MODEL}::${PROMPT_VERSION}::${maskedText.trim()}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  const unsigned = (hash >>> 0).toString(16);
  return `signalbridge_cache_${unsigned}_${input.length}`;
}

export interface CachedResponse {
  rawResponseText: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  cachedAt: number;
}

export function getFromCache(cacheKey: string): CachedResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as CachedResponse;
  } catch {
    return null;
  }
}

export function saveToCache(cacheKey: string, data: CachedResponse): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // localStorage quota might be full
  }
}

export function clearGeminiCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("signalbridge_cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Gemini Client Initializer
 */
function getGeminiClient(): GoogleGenAI {
  // Use authentication injected by AI Studio
  const apiKey =
    process.env.GEMINI_API_KEY ||
    (typeof window !== "undefined" && (window as any).GEMINI_API_KEY) ||
    "";

  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured. Please ensure GEMINI_API_KEY is available in the environment."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("500") ||
    msg.includes("internal") ||
    msg.includes("overloaded")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GeminiCallParams {
  contents: string;
  systemInstruction: string;
  responseSchema?: any;
  bypassCache?: boolean;
  cacheKey: string;
}

export interface GeminiCallResult {
  text: string;
  isCached: boolean;
  latencyMs: number;
  tokens: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

/**
 * Executes a Gemini generateContent request with:
 * - 20s timeout
 * - Max 4 concurrency
 * - Exponential backoff on 429/5xx (3 attempts)
 * - Telemetry logging
 */
export async function executeGeminiCall(params: GeminiCallParams): Promise<GeminiCallResult> {
  const { contents, systemInstruction, responseSchema, bypassCache = false, cacheKey } = params;

  // 1. Check cache first unless bypassCache is requested
  if (!bypassCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      currentTelemetry.cachedHits++;
      notifyTelemetryUpdate();
      return {
        text: cached.rawResponseText,
        isCached: true,
        latencyMs: 0,
        tokens: {
          promptTokens: cached.usageMetadata?.promptTokenCount || 0,
          candidatesTokens: cached.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: cached.usageMetadata?.totalTokenCount || 0,
        },
      };
    }
  }

  // 2. Concurrency limiting (max 4 parallel calls)
  await limiter.acquire();

  const startTime = performance.now();

  try {
    const ai = getGeminiClient();

    // 3. Retry loop with exponential backoff on 429 and 5xx
    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      try {
        // 4. 20s Timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`Gemini request timed out after ${API_TIMEOUT_MS / 1000}s`)),
            API_TIMEOUT_MS
          );
        });

        const apiPromise = ai.models.generateContent({
          model: GEMINI_MODEL,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.1, // low temperature for consistent triage
          },
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        const latencyMs = Math.round(performance.now() - startTime);

        const responseText = response.text || "";
        const usage = response.usageMetadata || {};
        const pTokens = usage.promptTokenCount || 0;
        const cTokens = usage.candidatesTokenCount || 0;
        const totTokens = usage.totalTokenCount || pTokens + cTokens;

        // Log telemetry
        currentTelemetry.liveCalls++;
        currentTelemetry.promptTokens += pTokens;
        currentTelemetry.candidatesTokens += cTokens;
        currentTelemetry.totalTokens += totTokens;
        currentTelemetry.latencies.push(latencyMs);
        notifyTelemetryUpdate();

        // Save to cache
        saveToCache(cacheKey, {
          rawResponseText: responseText,
          usageMetadata: {
            promptTokenCount: pTokens,
            candidatesTokenCount: cTokens,
            totalTokenCount: totTokens,
          },
          cachedAt: Date.now(),
        });

        return {
          text: responseText,
          isCached: false,
          latencyMs,
          tokens: {
            promptTokens: pTokens,
            candidatesTokens: cTokens,
            totalTokens: totTokens,
          },
        };
      } catch (err: any) {
        lastError = err;
        attempt++;
        if (attempt <= maxRetries && isRetryableError(err)) {
          // Exponential backoff: 1000ms, 2000ms, 4000ms + slight jitter
          const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 200;
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  } finally {
    limiter.release();
  }
}

/**
 * Computes run-time metrics derived from telemetry
 */
export function computeTelemetryStats(t: GeminiTelemetry) {
  const liveCalls = t.liveCalls;
  const totalTokens = t.totalTokens;

  let medianLatencyStr = "Not run yet";
  let slowestLatencyStr = "Not run yet";

  if (t.latencies.length > 0) {
    const sorted = [...t.latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    medianLatencyStr = `${median} ms`;
    slowestLatencyStr = `${sorted[sorted.length - 1]} ms`;
  }

  // Cost calculation
  const promptCost = (t.promptTokens / 1_000_000) * INPUT_TOKEN_PRICE_PER_MILLION;
  const outputCost = (t.candidatesTokens / 1_000_000) * OUTPUT_TOKEN_PRICE_PER_MILLION;
  const totalCost = promptCost + outputCost;

  return {
    liveCallsText: liveCalls > 0 ? String(liveCalls) : "Not run yet",
    totalTokensText: totalTokens > 0 ? String(totalTokens.toLocaleString()) : "Not run yet",
    promptTokensText: t.promptTokens > 0 ? String(t.promptTokens.toLocaleString()) : "Not run yet",
    candidatesTokensText:
      t.candidatesTokens > 0 ? String(t.candidatesTokens.toLocaleString()) : "Not run yet",
    medianLatencyText: medianLatencyStr,
    slowestLatencyText: slowestLatencyStr,
    estimatedCost: totalCost > 0 ? `$${totalCost.toFixed(4)}` : "$0.00",
  };
}
