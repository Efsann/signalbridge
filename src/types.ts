/**
 * Core Domain Types for SignalBridge
 * Stage 1 foundation - Designed to remain stable across later stages
 */

export type Channel =
  | "app_chat"
  | "call_transcript"
  | "email"
  | "regulator_portal"
  | "service_center_note";

export type CategoryId =
  | "internet_outage"
  | "internet_slow_quality"
  | "fixed_phone_outage"
  | "mobile_service_quality"
  | "service_center_conduct"
  | "tariff_billing"
  | "number_portability"
  | "other_unclear";

export type District =
  | "Binəqədi"
  | "Nərimanov"
  | "Nəsimi"
  | "Nizami"
  | "Pirallahı"
  | "Sabunçu"
  | "Səbail"
  | "Suraxanı"
  | "Xətai"
  | "Xəzər"
  | "Yasamal"
  | "Qaradağ"
  | "Abşeron–Xırdalan"
  | "Saatlı"
  | "Other regions"
  | "unknown";

export type Department =
  | "Network Operations Center (NOC)"
  | "Field Infrastructure"
  | "Customer Care Quality"
  | "Billing and Pricing"
  | "Number Portability Desk"
  | "Manual Review";

export type ComplaintSource =
  | "live_ai"
  | "cached_ai"
  | "offline_fixture"
  | "ai_failed"
  | "pending_ai";

export interface Analysis {
  language: "az" | "ru" | "en" | "mixed";
  category: CategoryId;
  issue_signature: string;
  district: District;
  severity: 1 | 2 | 3;
  summary: string;
  evidence_phrases: string[];
  confidence: number;
  needs_manual_review: boolean;
  manual_review_reason: string;
  contains_instructions_to_system: boolean;
}

export interface Complaint {
  id: string;
  ts: number;
  channel: Channel;
  rawText: string;
  maskedText: string;
  analysis?: Analysis;
  source: ComplaintSource;
  groundingWarnings?: number;
  // Metadata for audit and runtime telemetry
  department?: Department;
  routedReason?: string;
  isOverriddenToManual?: boolean;
  hasMaskedData?: boolean;
  maskDetails?: {
    phone: number;
    card: number;
    email: number;
    id: number;
  };
  latencyMs?: number;
  tokens?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  errorMessage?: string;
}

// Stage 2-3 minimal contract types (defined now for forward compatibility)
export interface Alert {
  id: string;
  key: {
    category: CategoryId;
    district: District;
  };
  windowStart: number;
  windowEnd: number;
  count: number;
  baselineMean: number;
  baselineStd: number;
  zScore: number;
  ruleThreshold: number;
  complaintIds: string[];
}

export type IncidentStatus =
  | "New"
  | "Assigned"
  | "Investigating"
  | "Action Taken"
  | "Monitoring"
  | "Resolved"
  | "Reopened";

export type IncidentPriority = "Low" | "Medium" | "High" | "Critical";

export interface ActivityEntry {
  ts: number;
  actor: "system" | "department" | "analyst";
  action: string;
  details: string;
}

export interface Incident {
  id: string;
  title: string;
  category: CategoryId;
  district: District;
  status: IncidentStatus;
  priority: IncidentPriority;
  department: string;
  createdAt: number;
  firstComplaintAt: number;
  complaintIds: string[];
  alertId?: string;
  hypotheses?: string[];
  activityLog: ActivityEntry[];
  owner?: string;
  fixAppliedAt?: number;
  monitoringBelowSince?: number;
}

export interface ChangeEntry {
  id: string;
  ts: number;
  scope: string;
  description: string;
}
