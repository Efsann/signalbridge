/**
 * Sector Pack: Telecommunications (DemoTel Baku)
 */

import { CategoryId, Department, District, Channel } from "../types";

export interface CategoryDefinition {
  id: CategoryId;
  displayName: string;
  department: Department;
  description: string;
}

export const TELECOM_CATEGORIES: Record<CategoryId, CategoryDefinition> = {
  internet_outage: {
    id: "internet_outage",
    displayName: "Internet outage",
    department: "Network Operations Center (NOC)",
    description: "Complete loss of fiber, GPON, or broadband internet connectivity.",
  },
  internet_slow_quality: {
    id: "internet_slow_quality",
    displayName: "Slow or poor internet",
    department: "Network Operations Center (NOC)",
    description: "High latency, packet loss, or speed significantly below contracted bandwidth.",
  },
  fixed_phone_outage: {
    id: "fixed_phone_outage",
    displayName: "Fixed phone outage",
    department: "Field Infrastructure",
    description: "No dial tone, line noise, or physical PSTN cable line fault.",
  },
  mobile_service_quality: {
    id: "mobile_service_quality",
    displayName: "Mobile coverage or call quality",
    department: "Network Operations Center (NOC)",
    description: "Cellular signal dropouts, 4G/5G weak reception, or call failure.",
  },
  service_center_conduct: {
    id: "service_center_conduct",
    displayName: "Service center conduct",
    department: "Customer Care Quality",
    description: "Front-desk counter behavior, branch service delays, or staff conduct.",
  },
  tariff_billing: {
    id: "tariff_billing",
    displayName: "Tariff or billing problem",
    department: "Billing and Pricing",
    description: "Unexpected balance deductions, package renewal errors, or invoice disputes.",
  },
  number_portability: {
    id: "number_portability",
    displayName: "Number portability",
    department: "Number Portability Desk",
    description: "Delays or rejections moving numbers (MNP) to or from DemoTel.",
  },
  other_unclear: {
    id: "other_unclear",
    displayName: "Unclear or other",
    department: "Manual Review",
    description: "Ambiguous, multi-issue, or non-telecom complaints requiring human inspection.",
  },
};

export const DISTRICTS: readonly District[] = [
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
  "Abşeron–Xırdalan",
  "Saatlı",
  "Other regions",
  "unknown",
] as const;

export const CHANNELS: readonly Channel[] = [
  "app_chat",
  "call_transcript",
  "email",
  "regulator_portal",
  "service_center_note",
] as const;

export const CHANNEL_LABELS: Record<Channel, string> = {
  app_chat: "Mobile App Chat",
  call_transcript: "Call Center Transcript",
  email: "Customer Email",
  regulator_portal: "Regulator Portal (ICTA)",
  service_center_note: "Service Center Note",
};

export const CATEGORY_IDS = Object.keys(TELECOM_CATEGORIES) as CategoryId[];
