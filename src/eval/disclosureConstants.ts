/**
 * Data and Disclosure Constants (Stage 4)
 * Fully data-driven constants representing published sources, synthetic disclosures,
 * system limitations, library inventory, and the demo-to-production blueprint.
 */

import { GEMINI_MODEL } from "../config";

export interface PublishedSource {
  title: string;
  url: string;
  description: string;
  role: string;
}

export const REAL_SOURCES: PublishedSource[] = [
  {
    title: "AZERTAG: E-Şikayət Statistics (Jan–Aug 2025)",
    url: "https://azertag.az/xeber/bu_ilin_8_ayi_erzinde_e_sikayet_sistemine_4_minden_artiq_muraciet_daxil_olub-3775823",
    description: "Official report on over 4,000 communications received by the national e-complaint portal across telecom sectors.",
    role: "Informed approximate high-level category distribution weights and baseline ratios for simulation.",
  },
  {
    title: "Ministry of Digital Development and Transport: E-Complaint Information System",
    url: "https://mincom.gov.az/en/projects/e-complaint-information-system",
    description: "National initiative portal for electronic complaint registration and dispute handling.",
    role: "Provided architectural context for public telecom oversight and citizen service delivery channels.",
  },
];

export const SYNTHETIC_DATA_DISCLOSURE =
  "No real operator data is used. All complaints, change-log entries and incidents are synthetic. Category and region weights are assumptions inspired by published figures, not measured data.";

export const DISCLOSURE_LIMITATIONS = [
  {
    category: "Traffic Volumes & Language Split",
    description: "Volume and language split are assumptions calibrated for demonstration rather than an actual operator log.",
  },
  {
    category: "Diurnal Variation",
    description: "Baselines ignore time-of-day fluctuations; real telecom networks exhibit distinct day/night traffic curves.",
  },
  {
    category: "Geographic Map",
    description: "The map visualization is schematic and district-aggregated, not a GIS-accurate fiber topographic GIS layer.",
  },
  {
    category: "Priority Rules",
    description: "Priority rules are heuristics based on severity counts and z-scores, not SLAs negotiated with regulators.",
  },
  {
    category: "Confidence Calibration",
    description: "Model confidence is uncalibrated raw model output, representing heuristic certainty rather than empirical probability.",
  },
  {
    category: "Cause Statements",
    description: "AI cause statements are hypotheses to be confirmed by the responsible engineering department, never established facts.",
  },
  {
    category: "Language Evaluation",
    description: "Azerbaijani accuracy must be checked and calibrated on real operator text corpora before field deployment.",
  },
  {
    category: "Baseline Savings Interpretation",
    description: "The baseline is a simplified rule proxy model, not a measured real operator process, so comparative results are not real monetary savings.",
  },
];

export interface ArchitectureComparison {
  dimension: string;
  demoState: string;
  productionBlueprint: string;
}

export const DEMO_TO_PRODUCTION_COMPARISON: ArchitectureComparison[] = [
  {
    dimension: "Architecture Pipeline",
    demoState: "React SPA + Gemini client SDK + localStorage caching",
    productionBlueprint: "React → Backend API → Queue (Kafka/RabbitMQ) → AI Service → Database → Incident Management",
  },
  {
    dimension: "API Key & Secret Security",
    demoState: "Frontend browser execution (Note: a key in a frontend app is visible in the browser)",
    productionBlueprint: "Server-side secret storage (Google Cloud Secret Manager / Vault) with zero frontend exposure",
  },
  {
    dimension: "Access Control & Roles",
    demoState: "Single operator demo interface with instant department switching",
    productionBlueprint: "Fine-grained Role-Based Access Control (RBAC): NOC Operator, Field Tech, Executive, Auditor",
  },
  {
    dimension: "Audit Log Persistence",
    demoState: "In-memory simulation state with reset capability",
    productionBlueprint: "Tamper-evident append-only SQL audit log with automated compliance archiving",
  },
  {
    dimension: "Integrations & Alerting",
    demoState: "Simulated fixtures and in-browser state machine",
    productionBlueprint: "BSS/OSS integration, NMS alarm correlation, PagerDuty, SMS/Email dispatch, CRM webhooks",
  },
];

export const LIBRARIES_INVENTORY = [
  { name: "@google/genai", version: "^2.4.0", purpose: "Official modern Gemini TypeScript SDK for structured JSON generation" },
  { name: "react / react-dom", version: "^19.0.1", purpose: "Reactive component hierarchy and UI rendering" },
  { name: "tailwindcss", version: "^4.3.3", purpose: "Utility-first modern styling and responsive interface layout" },
  { name: "lucide-react", version: "^0.546.0", purpose: "Clean iconography for telecommunications operational status" },
  { name: "zod", version: "^4.6.5", purpose: "Runtime schema validation and type safety parsing" },
  { name: "motion", version: "^12.23.24", purpose: "Smooth layout transitions and operational alert badges" },
];
