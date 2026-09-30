/**
 * CAREPATH AI - Master Autonomous Decision Engine (autonomousDecisionEngine.js)
 * 
 * Implements the continuous autonomous computing loop:
 * OBSERVE → ANALYZE → IDENTIFY MISSING → IDENTIFY UNCERTAINTY → IDENTIFY CONTRADICTIONS →
 * ASSESS RISK → REPLAN → SELECT NEXT QUESTION → ACT → CHECK TERMINATION → STOP OR REPEAT
 * 
 * Maintains canonical case state, decision trace, and staff escalation alerts.
 * 
 * @module engines/autonomousDecisionEngine
 */

const { getDb, saveDb, generateId, now, audit } = require("./dataStore");
const { extractFromText, detectCategory } = require("./symptomExtractionEngine");
const { selectNextQuestion, getMissingAttributes } = require("./questionSelectionEngine");
const { assessRisk } = require("./riskAssessmentEngine");
const { recommendDepartment } = require("./departmentRoutingEngine");
const { generateCaseSummary } = require("./caseSummaryEngine");
const { recordAutonomousCycle } = require("./performanceMonitor");
const {
  initializeCaseState,
  updateCaseState,
  detectMissingInformation,
  detectUncertainty,
  detectContradictions,
  isInformationSufficient,
  shouldStopQuestioning
} = require("./caseStateEngine");

/**
 * Initialize a new autonomous case state
 * 
 * @param {Object} consultation 
 * @param {Object} patient 
 */
function initCaseState(consultation, patient) {
  if (!consultation.structured) consultation.structured = {};
  if (!consultation.decisionTrace) consultation.decisionTrace = [];
  if (!consultation.vitals) consultation.vitals = {};
  if (!consultation.reports) consultation.reports = [];
  if (!consultation.priority) consultation.priority = "ROUTINE";
  if (!consultation.lifecycleState) consultation.lifecycleState = "NEW";

  consultation.patient = {
    id: patient?.id || consultation.patientId,
    name: patient?.name || consultation.patientName,
    age: patient?.age || consultation.structured.age?.value || 30,
    gender: patient?.gender || consultation.structured.gender?.value || "Unspecified"
  };

  // Canonical Case State
  consultation.caseState = initializeCaseState(consultation, consultation.patient);

  recordTrace(
    consultation,
    "Case initialized",
    `Patient ${consultation.patient.name} registered for intake session.`,
    "Ready for chief complaint inquiry",
    "OBSERVE"
  );
}

/**
 * Record an auditable step in the decision trace
 * 
 * @param {Object} consultation 
 * @param {string} event 
 * @param {string} detail 
 * @param {string} action 
 * @param {string} [stage="ACT"]
 * @param {Object} [metadata={}]
 */
function recordTrace(consultation, event, detail, action, stage = "ACT", metadata = {}) {
  if (!consultation.decisionTrace) consultation.decisionTrace = [];
  const traceItem = {
    timestamp: now(),
    stage,
    event,
    detail,
    action,
    ...metadata
  };
  consultation.decisionTrace.push(traceItem);
  return traceItem;
}

/**
 * Master Autonomous Case-Taking Cycle
 * 
 * Preconditions:
 * - consultation must be an active consultation object
 * 
 * Guarantees:
 * - Visibly executes OBSERVE -> ANALYZE -> UNCERTAINTY -> CONTRADICTION -> RISK -> REPLAN -> SELECT -> ACT
 * - Never gets trapped in infinite loop (max question ceiling & high-risk halting)
 * - Produces auditable structured decision trace
 * 
 * Complexity: O(q + e) where q is questions and e is entities
 * 
 * @param {Object} consultation 
 * @param {string} questionId 
 * @param {string} rawAnswer 
 * @param {string} [method="text"] 
 * @param {string} [language="en"] 
 * @returns {Object} Updated consultation
 */
function runAutonomousCaseTaking(consultation, questionId, rawAnswer, method = "text", language = "en") {
  const cycleStart = Date.now();
  const answer = String(rawAnswer || "").trim();

  if (!consultation.caseState) {
    consultation.caseState = initializeCaseState(consultation, consultation.patient);
  }

  // 1. OBSERVE: Receive and log patient response
  recordTrace(
    consultation,
    "Patient response received",
    `Question: [${questionId}], Answer length: ${answer.length} chars via ${method}`,
    "Initiating symptom and entity extraction",
    "OBSERVE",
    { questionId, method, answerLength: answer.length }
  );

  // 2. ANALYZE: Extract structured clinical attributes
  const extractStart = Date.now();
  const extracted = extractFromText(answer, questionId);
  const extractionMs = Date.now() - extractStart;

  // 3. UNCERTAINTY & CONTRADICTION CHECKS
  const uncertainties = detectUncertainty(answer, questionId);
  if (uncertainties.length > 0) {
    recordTrace(
      consultation,
      "Linguistic uncertainty detected",
      `Patient expressed uncertainty: "${uncertainties[0].marker}"`,
      "Tagging field with LOW confidence for physician review",
      "UNCERTAINTY_CHECK",
      { uncertainties }
    );
  }

  const contradictions = detectContradictions(consultation.caseState, extracted, answer);
  if (contradictions.length > 0) {
    recordTrace(
      consultation,
      "Testimony contradiction detected",
      contradictions[0].explanation,
      "Registering contradiction in case state for clarification planning",
      "CONTRADICTION_CHECK",
      { contradictions }
    );
  }

  // Update canonical CaseState
  updateCaseState(consultation.caseState, { questionId, answer }, extracted);

  // Update legacy structured mirror for backward compatibility
  if (questionId === "chief") {
    consultation.structured.chiefComplaint = {
      value: answer,
      source: "Patient initial statement",
      confidence: "HIGH"
    };
    consultation.complaintCategory = detectCategory(answer);
    consultation.caseState.complaintCategory = consultation.complaintCategory;
    recordTrace(
      consultation,
      "Complaint category identified",
      `Primary presentation mapped to [${consultation.complaintCategory}]`,
      "Tailoring dynamic clinical question roadmap",
      "ANALYZE",
      { category: consultation.complaintCategory }
    );
  }

  if (extracted.duration) {
    consultation.structured.duration = {
      value: extracted.duration,
      source: `Patient response to ${questionId}`,
      confidence: uncertainties.length > 0 ? "LOW" : "HIGH"
    };
  }

  if (questionId === "onset") {
    consultation.structured.onset = {
      value: answer,
      source: "Patient interview",
      confidence: "HIGH"
    };
  }

  if (extracted.severity !== null) {
    consultation.structured.severity = {
      value: extracted.severity,
      source: `Patient response to ${questionId}`,
      confidence: "HIGH"
    };
  } else if (questionId === "severity") {
    const parsedSev = parseInt(answer, 10);
    consultation.structured.severity = {
      value: isNaN(parsedSev) ? answer : parsedSev,
      source: "Patient interview",
      confidence: "HIGH"
    };
  }

  if (extracted.symptoms?.length > 0) {
    if (!consultation.structured.symptoms) {
      consultation.structured.symptoms = { value: [], source: "Patient interview" };
    }
    for (const sym of extracted.symptoms) {
      if (!consultation.structured.symptoms.value.includes(sym)) {
        consultation.structured.symptoms.value.push(sym);
      }
    }
  }

  if (extracted.associatedSymptoms?.length > 0) {
    if (!consultation.structured.associatedSymptoms) {
      consultation.structured.associatedSymptoms = { value: [], source: "Patient interview" };
    }
    for (const sym of extracted.associatedSymptoms) {
      if (!consultation.structured.associatedSymptoms.value.includes(sym)) {
        consultation.structured.associatedSymptoms.value.push(sym);
      }
    }
  }

  if (extracted.radiation) {
    consultation.structured.radiation = { value: extracted.radiation, source: "Patient interview" };
  }
  if (extracted.location) {
    consultation.structured.location = { value: extracted.location, source: "Patient interview" };
  }
  if (extracted.history?.length > 0) {
    consultation.structured.pastHistory = { value: extracted.history.join(", "), source: "Patient interview" };
  }

  // 4. ASSESS RISK: Clinical Risk Assessment
  const riskStart = Date.now();
  const risk = assessRisk(consultation);
  const riskAnalysisMs = Date.now() - riskStart;

  consultation.riskAssessment = risk;
  consultation.priority = risk.level;
  consultation.caseState.risk = {
    level: risk.level,
    score: risk.score,
    factors: risk.indicators
  };

  consultation.redFlags = risk.indicators.map((ind, i) => ({
    id: generateId("FLAG"),
    trigger: ind,
    evidence: risk.evidence[i] || answer,
    why: risk.rationale[i] || "Clinical evaluation required",
    severity: risk.level,
    source: "Autonomous Risk Engine",
    timestamp: now()
  }));

  recordTrace(
    consultation,
    "Risk assessment evaluated",
    `Preliminary Risk Level: ${risk.level}. Warning indicators detected: ${risk.indicators.length}`,
    risk.level === "HIGH" ? "Triggering clinical escalation protocol" : "Updating risk profile",
    "RISK_ASSESSMENT",
    { riskLevel: risk.level, score: risk.score, indicators: risk.indicators }
  );

  // 5. REPLAN & EVALUATE TERMINATION
  detectMissingInformation(consultation.caseState);
  consultation.missingInformation = consultation.caseState.missingInformation;

  const terminationCheck = shouldStopQuestioning(consultation.caseState, 6);

  if (terminationCheck.stop) {
    consultation.caseState.status = risk.level === "HIGH" ? "ESCALATED" : "COMPLETED";
    consultation.caseState.completionReason = terminationCheck.reason;

    if (risk.level === "HIGH") {
      consultation.lifecycleState = "HIGH_PRIORITY_DETECTED";
      triggerStaffAlert(consultation, risk);
      recordTrace(
        consultation,
        "Clinical interview accelerated",
        "High risk indicators detected; shortening interview for urgent clinical review",
        "Accelerating triage handover to medical team",
        "DECIDE",
        { riskLevel: risk.level }
      );
    }

    finalizeCase(consultation);

    recordTrace(
      consultation,
      "Autonomous interview terminated",
      `Stopping reason: ${terminationCheck.reason}`,
      "Transferred case to clinician review queue",
      "TERMINATE",
      { completionReason: terminationCheck.reason, questionCount: consultation.caseState.questionCount }
    );

    recordAutonomousCycle({
      totalMs: Date.now() - cycleStart,
      extractionMs,
      riskAnalysisMs,
      questionSelectionMs: 0
    });
    return consultation;
  }

  // 6. SELECT NEXT QUESTION
  const qSelectStart = Date.now();
  const nextQ = selectNextQuestion(consultation, language);
  const questionSelectionMs = Date.now() - qSelectStart;

  if (nextQ) {
    consultation.nextQuestion = nextQ;
    consultation.caseState.selectedQuestion = nextQ;
    consultation.lifecycleState = "INTERVIEWING";

    recordTrace(
      consultation,
      "Next dynamic question selected",
      `Next target: [${nextQ.id}]. Reason: ${nextQ.reason || "Missing information"}. Score: ${nextQ.score || 0}`,
      `Querying patient in ${language.toUpperCase()}`,
      "QUESTION_SELECTION",
      {
        selectedQuestion: nextQ.text,
        score: nextQ.score,
        reason: nextQ.reason,
        candidates: consultation.caseState.candidateQuestions
      }
    );
  } else {
    // No more productive questions exist
    consultation.caseState.status = "COMPLETED";
    consultation.caseState.completionReason = "SUFFICIENT_INFORMATION";
    finalizeCase(consultation);
  }

  recordAutonomousCycle({
    totalMs: Date.now() - cycleStart,
    extractionMs,
    riskAnalysisMs,
    questionSelectionMs
  });

  return consultation;
}

/**
 * Backward-compatible wrapper for processPatientResponse
 */
function processPatientResponse(consultation, questionId, rawAnswer, method = "text", language = "en") {
  return runAutonomousCaseTaking(consultation, questionId, rawAnswer, method, language);
}

/**
 * Finalize Case: Route, generate summary, move to doctor review
 * 
 * @param {Object} consultation 
 */
function finalizeCase(consultation) {
  consultation.missingInformation = getMissingAttributes(consultation);
  consultation.riskAssessment = assessRisk(consultation);
  consultation.priority = consultation.riskAssessment.level;

  if (consultation.caseState) {
    consultation.caseState.status = consultation.priority === "HIGH" ? "ESCALATED" : "COMPLETED";
  }

  // Route to department
  const routing = recommendDepartment(consultation);
  consultation.suggestedDepartment = routing.department;
  consultation.departmentConfidence = routing.confidence;
  consultation.routingReasons = routing.reasons;

  recordTrace(
    consultation,
    "Autonomous department routing",
    `Suggested department: ${routing.department} (Confidence: ${routing.confidence})`,
    "Attached routing rationale to case summary",
    "ACT",
    { department: routing.department, confidence: routing.confidence }
  );

  // Generate structured case summary
  consultation.summary = generateCaseSummary(consultation);
  consultation.state = "WAITING_FOR_DOCTOR";
  consultation.lifecycleState = "CASE_GENERATED";
  consultation.nextQuestion = null;
  consultation.updatedAt = now();

  saveDb();
}

/**
 * Updates vital signs and dynamically re-evaluates risk
 * 
 * @param {Object} consultation 
 * @param {Object} vitals 
 */
function updateVitals(consultation, vitals) {
  if (!consultation.vitals) consultation.vitals = {};
  Object.assign(consultation.vitals, vitals);

  if (consultation.caseState) {
    consultation.caseState.extractedEntities.vitals = consultation.vitals;
  }

  const previousPriority = consultation.priority;
  const newRisk = assessRisk(consultation);
  consultation.riskAssessment = newRisk;
  consultation.priority = newRisk.level;

  if (consultation.caseState) {
    consultation.caseState.risk.level = newRisk.level;
    consultation.caseState.risk.factors = newRisk.indicators;
  }

  recordTrace(
    consultation,
    "Vital signs integrated and evaluated",
    `Vitals: BP ${vitals.bloodPressure || vitals.bp || "N/A"}, HR ${vitals.heartRate || vitals.hr || "N/A"}, SpO2 ${vitals.spo2 || "N/A"}%`,
    `Triage priority updated: ${previousPriority} -> ${newRisk.level}`,
    "ACT",
    { vitals, previousPriority, newPriority: newRisk.level }
  );

  if (newRisk.level === "HIGH" && previousPriority !== "HIGH") {
    triggerStaffAlert(consultation, newRisk);
  }

  finalizeCase(consultation);
}

/**
 * Triggers a staff alert for high-priority emergency cases
 * 
 * @param {Object} consultation 
 * @param {Object} risk 
 */
function triggerStaffAlert(consultation, risk) {
  const db = getDb();
  const existingAlert = (db.alerts || []).find(a => a.consultationId === consultation.id);
  if (existingAlert) return;

  const alert = {
    id: generateId("ALERT"),
    consultationId: consultation.id,
    displayId: consultation.displayId || consultation.id,
    patientName: consultation.patientName || "Anonymous Patient",
    doctorId: consultation.doctorId,
    hospitalId: consultation.hospitalId,
    suggestedDepartment: consultation.suggestedDepartment || "Emergency",
    severity: "HIGH",
    indicators: risk.indicators || consultation.redFlags?.map(r => r.trigger) || ["Acute condition"],
    evidence: risk.evidence || [],
    acknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: now()
  };

  if (!db.alerts) db.alerts = [];
  db.alerts.push(alert);
  saveDb();

  audit("EMERGENCY_STAFF_ALERT_DISPATCHED", { id: "SYSTEM", role: "AUTONOMOUS_ENGINE" }, consultation.id, {
    indicators: alert.indicators,
    suggestedDepartment: alert.suggestedDepartment
  });
}

/**
 * Ingests clinical lab/radiology report
 * 
 * @param {Object} consultation 
 * @param {Object} report 
 */
function ingestReport(consultation, report) {
  if (!consultation.reports) consultation.reports = [];
  consultation.reports.push({
    id: generateId("REP"),
    fileName: report.fileName,
    extractedData: report.extractedData || {},
    timestamp: now()
  });

  recordTrace(
    consultation,
    "Diagnostic report ingested",
    `File: ${report.fileName}`,
    "Incorporating findings into case summary",
    "ACT",
    { fileName: report.fileName }
  );

  finalizeCase(consultation);
}

module.exports = {
  initCaseState,
  runAutonomousCaseTaking,
  processPatientResponse,
  finalizeCase,
  updateVitals,
  ingestReport,
  triggerStaffAlert,
  recordTrace
};
