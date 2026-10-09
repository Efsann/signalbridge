/**
 * Pure Routing Engine for SignalBridge
 * Enforces strict code-side deterministic routing.
 * Department assignments NEVER originate from model output.
 */

import { TELECOM_CATEGORIES } from "../sectors/telecom";
import { CategoryId, Department, ComplaintSource } from "../types";

export interface RouteDecision {
  department: Department;
  isOverridden: boolean;
  overrideReason?: string;
}

export interface RoutingInput {
  category?: CategoryId;
  confidence?: number;
  needsManualReview?: boolean;
  containsInstructionsToSystem?: boolean;
  source: ComplaintSource;
}

/**
 * Pure function: calculates destination department based on telecom routing table
 * with strict safety overrides to "Manual Review".
 */
export function calculateRouting(input: RoutingInput): RouteDecision {
  const {
    category,
    confidence = 0,
    needsManualReview = false,
    containsInstructionsToSystem = false,
    source,
  } = input;

  // Rule 1: AI Failed
  if (source === "ai_failed") {
    return {
      department: "Manual Review",
      isOverridden: true,
      overrideReason: "Overridden: AI analysis failed or returned invalid schema",
    };
  }

  // Rule 2: Pending AI
  if (source === "pending_ai") {
    return {
      department: "Manual Review",
      isOverridden: true,
      overrideReason: "Overridden: Pending AI classification",
    };
  }

  // Rule 3: Contains prompt injection / instructions to system
  if (containsInstructionsToSystem) {
    return {
      department: "Manual Review",
      isOverridden: true,
      overrideReason:
        "Security Override: Customer text contained system instructions; routed to Manual Review",
    };
  }

  // Rule 4: Explicit manual review flag
  if (needsManualReview) {
    return {
      department: "Manual Review",
      isOverridden: true,
      overrideReason:
        "Overridden: Complaint flagged as ambiguous, multi-issue, or needs human review",
    };
  }

  // Rule 5: Low confidence (< 0.6)
  if (confidence < 0.6) {
    return {
      department: "Manual Review",
      isOverridden: true,
      overrideReason: `Overridden: Model confidence (${Math.round(
        confidence * 100
      )}%) below safety threshold of 60%`,
    };
  }

  // Fallback if category missing
  if (!category || !TELECOM_CATEGORIES[category]) {
    return {
      department: "Manual Review",
      isOverridden: true,
      overrideReason: "Overridden: Missing or invalid category",
    };
  }

  // Code-side routing table lookup
  const targetDepartment = TELECOM_CATEGORIES[category].department;

  return {
    department: targetDepartment,
    isOverridden: false,
    overrideReason: `Direct Route: Mapped from category "${TELECOM_CATEGORIES[category].displayName}"`,
  };
}
