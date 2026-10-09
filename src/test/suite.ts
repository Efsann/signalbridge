/**
 * Unit Test Suite for SignalBridge Routing Engine & PII Masking
 * Can be run in-memory or rendered in the diagnostic drawer.
 */

import { maskPII } from "../lib/mask";
import { calculateRouting } from "../engine/routing";
import { evaluateDetection, DEFAULT_DETECTION_SETTINGS } from "../engine/detection";
import { calculatePriority } from "../engine/priority";
import {
  handleAlertIncident,
  canTransition,
  transitionIncidentStatus,
  getAllowedNextStatuses,
  assignIncidentOwner,
} from "../engine/incidents";
import {
  applyFixAndStartMonitoring,
  evaluateMonitoring,
} from "../engine/monitoring";
import { routeWithBaseline, normalizeForBaseline } from "../eval/baselineRouter";
import { PRELOADED_TEST_SET, parseEvaluationImport } from "../eval/preloadedDataset";
import { Complaint, Alert, Incident } from "../types";

export interface TestCaseResult {
  suite: "Masking" | "Routing" | "Detection" | "Priority" | "Incidents" | "StateMachine" | "Monitoring" | "BaselineRouter" | "Evaluation";
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
}

export function runSignalBridgeUnitTests(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  function assert(
    suite: "Masking" | "Routing" | "Detection" | "Priority" | "Incidents" | "StateMachine" | "Monitoring" | "BaselineRouter" | "Evaluation",
    name: string,
    actual: any,
    expected: any,
    comparator?: (a: any, b: any) => boolean
  ) {
    const passed = comparator ? comparator(actual, expected) : actual === expected;
    results.push({
      suite,
      name,
      passed,
      expected,
      actual,
      error: passed ? undefined : `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
    });
  }

  // --- MASKING TESTS ---
  // 1. Phone numbers
  const phoneRes1 = maskPII("Nömrəm +994 50 123 45 67, əlaqə saxlayın.");
  assert("Masking", "Masks Azerbaijani international format phone number (+994 50 123 45 67)", phoneRes1.maskedText, "Nömrəm [PHONE], əlaqə saxlayın.");
  assert("Masking", "Flag hasMaskedData is true for phone", phoneRes1.hasMaskedData, true);

  const phoneRes2 = maskPII("Zəng edin: 050 123 45 67");
  assert("Masking", "Masks Azerbaijani local format phone (050 123 45 67)", phoneRes2.maskedText, "Zəng edin: [PHONE]");

  const phoneRes3 = maskPII("Baku fixed phone: 012-498-23-45");
  assert("Masking", "Masks Baku city fixed line (012-498-23-45)", phoneRes3.maskedText, "Baku fixed phone: [PHONE]");

  // 2. Card numbers (13-19 digits)
  const cardRes = maskPII("Kartımdan pul çıxıldı: 4169 7388 1234 5678");
  assert("Masking", "Masks 16-digit credit card number", cardRes.maskedText, "Kartımdan pul çıxıldı: [CARD]");

  // 3. Email
  const emailRes = maskPII("Mənə support@demotel.az ünvanına yazın.");
  assert("Masking", "Masks email address", emailRes.maskedText, "Mənə [EMAIL] ünvanına yazın.");

  // 4. FIN Code
  const finRes = maskPII("Şəxsiyyət vəsiqəsi FIN 1234567 və ya FIN: 7A6B5C4");
  assert("Masking", "Masks FIN identification numbers", finRes.maskedText, "Şəxsiyyət vəsiqəsi [ID] və ya [ID]");

  // 5. Clean text without PII
  const cleanRes = maskPII("İnternet işləmir, modem qırmızı yanır.");
  assert("Masking", "Does not alter text without PII", cleanRes.maskedText, "İnternet işləmir, modem qırmızı yanır.");
  assert("Masking", "hasMaskedData is false when no PII exists", cleanRes.hasMaskedData, false);

  // --- ROUTING TESTS ---
  // 1. Direct NOC routing for internet_outage
  const routeNoc = calculateRouting({
    category: "internet_outage",
    confidence: 0.95,
    needsManualReview: false,
    containsInstructionsToSystem: false,
    source: "live_ai",
  });
  assert("Routing", "Direct route: internet_outage -> Network Operations Center (NOC)", routeNoc.department, "Network Operations Center (NOC)");
  assert("Routing", "No override on high-confidence valid outage", routeNoc.isOverridden, false);

  // 2. Direct Field Infrastructure for fixed_phone_outage
  const routeFixed = calculateRouting({
    category: "fixed_phone_outage",
    confidence: 0.9,
    needsManualReview: false,
    containsInstructionsToSystem: false,
    source: "live_ai",
  });
  assert("Routing", "Direct route: fixed_phone_outage -> Field Infrastructure", routeFixed.department, "Field Infrastructure");

  // 3. Direct Billing and Pricing for tariff_billing
  const routeBilling = calculateRouting({
    category: "tariff_billing",
    confidence: 0.88,
    needsManualReview: false,
    containsInstructionsToSystem: false,
    source: "live_ai",
  });
  assert("Routing", "Direct route: tariff_billing -> Billing and Pricing", routeBilling.department, "Billing and Pricing");

  // 4. Safety Override: Confidence < 0.6
  const routeLowConf = calculateRouting({
    category: "internet_outage",
    confidence: 0.54,
    needsManualReview: false,
    containsInstructionsToSystem: false,
    source: "live_ai",
  });
  assert("Routing", "Override to Manual Review when confidence < 0.6", routeLowConf.department, "Manual Review");
  assert("Routing", "isOverridden flag is true for low confidence", routeLowConf.isOverridden, true);

  // 5. Safety Override: Contains instructions to system (prompt injection)
  const routeInjection = calculateRouting({
    category: "internet_outage",
    confidence: 0.99,
    needsManualReview: false,
    containsInstructionsToSystem: true,
    source: "live_ai",
  });
  assert("Routing", "Override to Manual Review when contains_instructions_to_system is true", routeInjection.department, "Manual Review");
  assert("Routing", "isOverridden flag is true for prompt injection attempt", routeInjection.isOverridden, true);

  // 6. Safety Override: AI Failed
  const routeAiFailed = calculateRouting({
    source: "ai_failed",
  });
  assert("Routing", "Route to Manual Review when AI fails", routeAiFailed.department, "Manual Review");

  // 7. Safety Override: Pending AI
  const routePending = calculateRouting({
    source: "pending_ai",
  });
  assert("Routing", "Route to Manual Review when AI is pending", routePending.department, "Manual Review");

  // 8. Explicit needsManualReview flag
  const routeManualFlag = calculateRouting({
    category: "other_unclear",
    confidence: 0.8,
    needsManualReview: true,
    containsInstructionsToSystem: false,
    source: "live_ai",
  });
  assert("Routing", "Route to Manual Review when needsManualReview is explicitly true", routeManualFlag.department, "Manual Review");

  // --- DETECTION TESTS ---
  const simTime = 1000000;
  const dummyComplaints: Complaint[] = [];

  // Generate 12 complaints in Binagadi for internet_outage
  for (let i = 0; i < 12; i++) {
    dummyComplaints.push({
      id: `TEST-BIN-${i}`,
      ts: simTime - i * 30000, // within the last 6 minutes
      channel: "app_chat",
      rawText: "Internet kəsilib Binəqədidə",
      maskedText: "Internet kəsilib Binəqədidə",
      source: "cached_ai",
      analysis: {
        language: "az",
        category: "internet_outage",
        issue_signature: "optical_fiber_outage",
        district: "Binəqədi",
        severity: 3,
        summary: "Outage in Binagadi",
        evidence_phrases: ["Internet kəsilib"],
        confidence: 0.95,
        needs_manual_review: false,
        manual_review_reason: "",
        contains_instructions_to_system: false,
      },
    });
  }

  // 1. Alert generation when count >= max(MIN_COUNT, mean + K*std)
  const detResult1 = evaluateDetection(dummyComplaints, simTime, new Map(), DEFAULT_DETECTION_SETTINGS);
  assert("Detection", "Generates alert when count (12) >= threshold", detResult1.newAlerts.length, 1);
  if (detResult1.newAlerts.length > 0) {
    assert("Detection", "Alert category matches Binagadi internet_outage", detResult1.newAlerts[0].key.category, "internet_outage");
    assert("Detection", "Alert district matches Binəqədi", detResult1.newAlerts[0].key.district, "Binəqədi");
  }

  // 2. ONE ALERT PER EPISODE: within cooldown (15 min), do not create a second alert
  const detResult2 = evaluateDetection(dummyComplaints, simTime + 60000, detResult1.updatedEpisodes, DEFAULT_DETECTION_SETTINGS);
  assert("Detection", "Cooldown suppresses duplicate alert in same episode", detResult2.newAlerts.length, 0);
  assert("Detection", "Continuing episode attached correctly", detResult2.continuingEpisodes.length, 1);

  // 3. Pending AI complaints are NOT counted in detection
  const pendingComplaints: Complaint[] = [
    {
      id: "PENDING-1",
      ts: simTime,
      channel: "app_chat",
      rawText: "İnternet yoxdur",
      maskedText: "İnternet yoxdur",
      source: "pending_ai",
    },
  ];
  const detResultPending = evaluateDetection(pendingComplaints, simTime);
  assert("Detection", "Pending AI complaints are ignored by detection engine", detResultPending.totalCompanyCount, 0);

  // 4. Fixed-threshold comparator rule triggers when total >= FIXED_THRESHOLD (40)
  const companySurge: Complaint[] = [];
  for (let i = 0; i < 42; i++) {
    companySurge.push({
      id: `SURGE-${i}`,
      ts: simTime - i * 10000,
      channel: "email",
      rawText: "Diffused complaint",
      maskedText: "Diffused complaint",
      source: "cached_ai",
      analysis: {
        language: "az",
        category: "tariff_billing",
        district: "unknown",
        issue_signature: "billing_surge",
        severity: 1,
        summary: "Billing note",
        evidence_phrases: [],
        confidence: 0.9,
        needs_manual_review: false,
        manual_review_reason: "",
        contains_instructions_to_system: false,
      },
    });
  }
  const detResultSurge = evaluateDetection(companySurge, simTime);
  assert("Detection", "Fixed-threshold comparator triggers when company total >= 40", detResultSurge.fixedThresholdAlert !== undefined, true);

  // --- PRIORITY HEURISTICS TESTS ---
  // 1. High priority when count >= 25 or zScore >= 5
  const prioHigh1 = calculatePriority({
    category: "internet_outage",
    zScore: 6.2,
    count: 14,
  });
  assert("Priority", "High priority on Z-score >= 5.0", prioHigh1.priority, "High");

  const prioHigh2 = calculatePriority({
    category: "internet_outage",
    zScore: 3.1,
    count: 26,
  });
  assert("Priority", "High priority on count >= 25", prioHigh2.priority, "High");

  // 2. Average severity >= 2.5 promotes Medium to High
  const prioPromote = calculatePriority({
    category: "internet_outage",
    zScore: 3.5,
    count: 12,
    avgSeverity: 2.8,
  });
  assert("Priority", "Severity signal >= 2.5 promotes Medium to High", prioPromote.priority, "High");

  // 3. Medium priority for standard alert
  const prioMed = calculatePriority({
    category: "internet_outage",
    zScore: 3.2,
    count: 10,
    avgSeverity: 1.5,
  });
  assert("Priority", "Medium priority for standard alert", prioMed.priority, "Medium");

  // --- INCIDENTS TESTS ---
  // 1. Code-generated title: `${categoryDisplayName} spike in ${districtName}`
  const mockAlert: Alert = {
    id: "ALT-TEST-1",
    key: {
      category: "internet_outage",
      district: "Binəqədi",
    },
    windowStart: simTime - 900000,
    windowEnd: simTime,
    count: 15,
    baselineMean: 1.2,
    baselineStd: 1.0,
    zScore: 13.8,
    ruleThreshold: 8,
    complaintIds: ["C1", "C2", "C3"],
  };

  const compMap = new Map<string, Complaint>();
  mockAlert.complaintIds.forEach((id) => {
    compMap.set(id, {
      id,
      ts: simTime,
      channel: "app_chat",
      rawText: "Outage",
      maskedText: "Outage",
      source: "cached_ai",
      analysis: {
        language: "az",
        category: "internet_outage",
        district: "Binəqədi",
        issue_signature: "fiber_cut",
        severity: 3,
        summary: "Outage in Binagadi",
        evidence_phrases: [],
        confidence: 0.95,
        needs_manual_review: false,
        manual_review_reason: "",
        contains_instructions_to_system: false,
      },
    });
  });

  const incResult1 = handleAlertIncident(mockAlert, compMap, [], simTime);
  assert("Incidents", "Generates single new incident on alert", incResult1.incidents.length, 1);
  if (incResult1.incidents.length > 0) {
    const inc = incResult1.incidents[0];
    assert("Incidents", "Code-generated title matches expected format", inc.title, "Internet outage spike in Binəqədi");
    assert("Incidents", "Initial status is New", inc.status, "New");
    assert("Incidents", "Routes to NOC for internet_outage", inc.department, "Network Operations Center (NOC)");
    assert("Incidents", "Activity entry logged for creation", inc.activityLog.length >= 1, true);
  }

  // 2. Dedup & Attach: Attaching new complaint IDs to existing incident
  const mockAlert2: Alert = {
    ...mockAlert,
    complaintIds: ["C2", "C3", "C4", "C5"], // C2 and C3 are duplicates, C4 and C5 are new
  };
  const incResult2 = handleAlertIncident(mockAlert2, compMap, incResult1.incidents, simTime + 30000);
  if (incResult2.updatedIncident) {
    assert("Incidents", "Deduplicates complaint IDs on attachment (3 + 2 = 5)", incResult2.updatedIncident.complaintIds.length, 5);
  }

  // --- STAGE 3: STATE MACHINE TESTS ---
  // 1. Allowed transitions: New -> Assigned -> Investigating -> Action Taken -> Monitoring -> Resolved
  assert("StateMachine", "Allowed: New -> Assigned", canTransition("New", "Assigned"), true);
  assert("StateMachine", "Allowed: Assigned -> Investigating", canTransition("Assigned", "Investigating"), true);
  assert("StateMachine", "Allowed: Investigating -> Action Taken", canTransition("Investigating", "Action Taken"), true);
  assert("StateMachine", "Allowed: Action Taken -> Monitoring", canTransition("Action Taken", "Monitoring"), true);
  assert("StateMachine", "Allowed: Monitoring -> Resolved", canTransition("Monitoring", "Resolved"), true);
  assert("StateMachine", "Disallowed: New -> Resolved", canTransition("New", "Resolved"), false);
  assert("StateMachine", "Disallowed: New -> Action Taken", canTransition("New", "Action Taken"), false);

  // 2. Reopened status transitions: Reopened -> Investigating only
  assert("StateMachine", "Allowed: Reopened -> Investigating", canTransition("Reopened", "Investigating"), true);
  assert("StateMachine", "Disallowed: Reopened -> Action Taken", canTransition("Reopened", "Action Taken"), false);
  assert("StateMachine", "Disallowed: Reopened -> Resolved", canTransition("Reopened", "Resolved"), false);

  // 3. transitionIncidentStatus enforcement
  const baseInc = incResult1.incidents[0];
  const invalidTrans = transitionIncidentStatus(baseInc, "Resolved", "analyst", "Skip steps", simTime);
  assert("StateMachine", "Blocks invalid transition from New to Resolved", invalidTrans.success, false);

  const validTrans1 = transitionIncidentStatus(baseInc, "Assigned", "analyst", "Assigned to tech", simTime);
  assert("StateMachine", "Allows valid transition from New to Assigned", validTrans1.success, true);
  assert("StateMachine", "Updated incident status is Assigned", validTrans1.incident.status, "Assigned");

  // 4. Free-text Assign Owner advances New to Assigned
  const assignedInc = assignIncidentOwner(baseInc, "T. Mammadov (NOC)", "department", simTime);
  assert("StateMachine", "assignIncidentOwner stores owner name", assignedInc.owner, "T. Mammadov (NOC)");
  assert("StateMachine", "assignIncidentOwner advances New to Assigned", assignedInc.status, "Assigned");
  assert("StateMachine", "Activity entry logged for owner assignment", assignedInc.activityLog.some((a) => a.action === "Owner assigned"), true);

  // --- STAGE 3: REOPENING TESTS ---
  // 1. Reopening Resolved incident when new alert arrives after cooldown
  const resolvedInc: Incident = {
    ...baseInc,
    id: "INC-RESOLVED-1",
    status: "Resolved",
  };
  const reopenAlert: Alert = {
    ...mockAlert,
    id: "ALT-REOPEN-1",
    complaintIds: ["C10", "C11"],
  };
  const reopenRes = handleAlertIncident(reopenAlert, compMap, [resolvedInc], simTime + 60000);
  assert("StateMachine", "Reopens Resolved incident on new alert after cooldown", reopenRes.updatedIncident?.status, "Reopened");
  assert("StateMachine", "Reopen logs ActivityEntry", reopenRes.updatedIncident?.activityLog.some((a) => a.action === "Incident Reopened"), true);

  // 2. Reopening from Monitoring when complaints surge above alert condition
  const monitoringInc: Incident = {
    ...baseInc,
    id: "INC-MONITORING-1",
    status: "Monitoring",
  };
  const surgeAlert: Alert = {
    ...mockAlert,
    id: "ALT-SURGE-1",
    complaintIds: ["C20", "C21"],
  };
  const surgeRes = handleAlertIncident(surgeAlert, compMap, [monitoringInc], simTime + 60000, "INC-MONITORING-1");
  assert("StateMachine", "Surge during Monitoring transitions incident to Reopened", surgeRes.updatedIncident?.status, "Reopened");

  // --- STAGE 3: POST-FIX MONITORING TESTS ---
  // 1. applyFixAndStartMonitoring moves incident to Monitoring and logs fix timestamp
  const fixedInc = applyFixAndStartMonitoring(baseInc, simTime);
  assert("Monitoring", "applyFix transitions incident to Monitoring", fixedInc.status, "Monitoring");
  assert("Monitoring", "applyFix records fixAppliedAt timestamp", fixedInc.fixAppliedAt, simTime);

  // 2. Auto-suggest Resolved once count stays <= mean + std for 30 minutes
  const evalAutoResolve = evaluateMonitoring(
    fixedInc,
    1, // current 15m count (normal)
    1.2, // mean
    1.0, // std
    8, // alertThreshold
    simTime + 35 * 60 * 1000, // 35 minutes later
    simTime // below threshold since simTime
  );
  assert("Monitoring", "Auto-suggests Resolved after 30+ minutes below threshold", evalAutoResolve.canAutoResolve, true);

  // 3. Do NOT auto-resolve if only 10 minutes below threshold
  const evalTooEarly = evaluateMonitoring(
    fixedInc,
    1,
    1.2,
    1.0,
    8,
    simTime + 10 * 60 * 1000, // only 10 min
    simTime
  );
  assert("Monitoring", "Does not auto-resolve before 30 minutes below threshold", evalTooEarly.canAutoResolve, false);

  // 4. Resurgence detection during monitoring
  const evalResurgence = evaluateMonitoring(
    fixedInc,
    14, // surge count >= alertThreshold (8)
    1.2,
    1.0,
    8,
    simTime + 15 * 60 * 1000,
    simTime
  );
  assert("Monitoring", "Flags shouldReopen when count >= alertThreshold during monitoring", evalResurgence.shouldReopen, true);

  // --- STAGE 4: BASELINE ROUTER & EVALUATION TESTS ---
  // 1. Azerbaijani diacritic folding normalization
  const normFolded = normalizeForBaseline("İnternet kəsilib, modemdə qırmızı işıq yanır");
  assert("BaselineRouter", "Folds Azerbaijani diacritics ə->e, ı->i", normFolded.folded.includes("kesilib"), true);
  assert("BaselineRouter", "Folds Azerbaijani diacritics ş->s, ı->i", normFolded.folded.includes("isiq"), true);

  // 2. Baseline routing internet outage
  const baseOutage = routeWithBaseline("Binəqədi rayonunda optik internet kəsilib, qırmızı işıq yanır");
  assert("BaselineRouter", "Routes internet outage keyword match", baseOutage.category, "internet_outage");
  assert("BaselineRouter", "Routes to NOC department", baseOutage.department, "Network Operations Center (NOC)");
  assert("BaselineRouter", "Extracts Binəqədi district", baseOutage.district, "Binəqədi");

  // 3. Baseline routing without special characters (folded matching)
  const baseFolded = routeWithBaseline("internet kesilib modemde qirmizi isiq yanir");
  assert("BaselineRouter", "Matches without Azerbaijani diacritics via folded rules", baseFolded.category, "internet_outage");

  // 4. Baseline routing Russian fixed phone
  const baseRuPhone = routeWithBaseline("В квартире не работает городской стационарный телефон, нет гудка");
  assert("BaselineRouter", "Routes Russian fixed phone outage", baseRuPhone.category, "fixed_phone_outage");
  assert("BaselineRouter", "Routes fixed phone to Field Infrastructure", baseRuPhone.department, "Field Infrastructure");

  // 5. Baseline routing English billing dispute
  const baseEnBill = routeWithBaseline("I was overcharged on my bill and double charged for subscription");
  assert("BaselineRouter", "Routes English billing issue", baseEnBill.category, "tariff_billing");
  assert("BaselineRouter", "Routes billing to Billing and Pricing", baseEnBill.department, "Billing and Pricing");

  // 6. Preloaded Test Set size & structure
  assert("Evaluation", "Preloaded test set contains 12 rows", PRELOADED_TEST_SET.length, 12);
  assert("Evaluation", "Preloaded rows marked isExample true", PRELOADED_TEST_SET.every((r) => r.isExample === true), true);

  // 7. CSV Import parsing
  const testCSV = "id,text,language,channel,true_category,true_district,expect_manual_review,is_injection_test\nT1,\"Internet yoxdur\",az,app_chat,internet_outage,Binəqədi,false,false";
  const parsedCSV = parseEvaluationImport(testCSV, "csv");
  assert("Evaluation", "Parses CSV test set with correct length", parsedCSV.length, 1);
  assert("Evaluation", "Parses CSV row true_category", parsedCSV[0].true_category, "internet_outage");
  assert("Evaluation", "Parses CSV row true_district", parsedCSV[0].true_district, "Binəqədi");

  return results;
}
