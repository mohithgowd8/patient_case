/**
 * CAREPATH AI - Master Autonomous Decision Engine (autonomousDecisionEngine.js)
 * Implements the continuous autonomous computing loop:
 * OBSERVE → ANALYZE → REASON → DECIDE → ACT → OBSERVE AGAIN
 * Maintains the case state, decision trace, and staff escalation alerts.
 */

const { getDb, saveDb, generateId, now, audit } = require("./dataStore");
const { extractFromText, detectCategory } = require("./symptomExtractionEngine");
const { selectNextQuestion, getMissingAttributes } = require("./questionSelectionEngine");
const { assessRisk } = require("./riskAssessmentEngine");
const { recommendDepartment } = require("./departmentRoutingEngine");
const { generateCaseSummary } = require("./caseSummaryEngine");
const { recordAutonomousCycle } = require("./performanceMonitor");

/**
 * Initialize a new autonomous case state
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

  recordTrace(
    consultation,
    "Case initialized",
    `Patient ${consultation.patient.name} registered for intake session.`,
    "Ready for chief complaint inquiry"
  );
}

/**
 * Record an auditable step in the decision trace
 */
function recordTrace(consultation, event, detail, action) {
  if (!consultation.decisionTrace) consultation.decisionTrace = [];
  const traceItem = {
    timestamp: now(),
    event,
    detail,
    action
  };
  consultation.decisionTrace.push(traceItem);
  return traceItem;
}

/**
 * Core Autonomous Cycle: Process patient response
 */
function processPatientResponse(consultation, questionId, rawAnswer, method = "text", language = "en") {
  const cycleStart = Date.now();
  const answer = String(rawAnswer || "").trim();

  // 1. OBSERVE: Receive and log patient response
  recordTrace(
    consultation,
    "Patient response received",
    `Question: [${questionId}], Answer length: ${answer.length} chars via ${method}`,
    "Initiating symptom and entity extraction"
  );

  // 2. ANALYZE: Extract structured clinical attributes
  const extractStart = Date.now();
  const extracted = extractFromText(answer, questionId);
  const extractionMs = Date.now() - extractStart;

  // Map to structured case state
  if (!consultation.structured) consultation.structured = {};

  const sourceDesc = method === "voice" ? "Patient voice transcription" : "Patient text response";

  if (questionId === "chief") {
    consultation.structured.chiefComplaint = { value: answer, source: sourceDesc, raw: answer };
    consultation.complaintCategory = extracted.detectedCategory || detectCategory(answer);
    recordTrace(
      consultation,
      "Complaint category identified",
      `Primary category mapped to: ${consultation.complaintCategory.toUpperCase()}`,
      "Activated category-specific clinical question planner"
    );
  } else {
    // Map specific question answers
    const attrMap = {
      onset: "onset",
      severity: "severity",
      location: "location",
      radiation: "radiation",
      breathing: "breathing",
      associated: "associatedSymptoms",
      food: "foodRelation",
      vomiting: "gastrointestinalSymptoms",
      fever: "fever",
      past: "pastHistory",
      medicines: "medications",
      allergies: "allergies"
    };

    const targetField = attrMap[questionId] || questionId;
    consultation.structured[targetField] = {
      value: answer,
      source: sourceDesc,
      raw: answer
    };
  }

  // Cross-extract any opportunistic attributes (e.g. patient gave severity or duration in chief complaint)
  if (extracted.severity && !consultation.structured.severity) {
    consultation.structured.severity = {
      value: String(extracted.severity),
      source: "Extracted opportunistically from response text",
      raw: answer
    };
    recordTrace(
      consultation,
      "Opportunistic entity extraction",
      `Detected severity: ${extracted.severity}/10 from narrative text`,
      "Marked severity as resolved without needing redundant question"
    );
  }

  if (extracted.duration && !consultation.structured.onset) {
    consultation.structured.onset = {
      value: extracted.duration,
      source: "Extracted opportunistically from response text",
      raw: answer
    };
    recordTrace(
      consultation,
      "Opportunistic entity extraction",
      `Detected duration: ${extracted.duration}`,
      "Marked onset as resolved without needing redundant question"
    );
  }

  // 3. REASON: Risk Assessment
  const riskStart = Date.now();
  const risk = assessRisk(consultation);
  const riskAnalysisMs = Date.now() - riskStart;

  consultation.riskAssessment = risk;
  consultation.priority = risk.level;
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
    risk.level === "HIGH" ? "Triggering clinical escalation protocol" : "Updating risk profile"
  );

  // 4. DECIDE & ACT: Check for High-Risk Emergency Escalation
  if (risk.level === "HIGH") {
    consultation.lifecycleState = "HIGH_PRIORITY_DETECTED";
    triggerStaffAlert(consultation, risk);

    // Stop unnecessary questioning if we already have the chief complaint and at least 2 responses
    if ((consultation.responses || []).length >= 2) {
      finalizeCase(consultation);
      recordTrace(
        consultation,
        "Autonomous interview accelerated",
        "High-priority indicators established. Halting non-urgent questioning to prevent care delay.",
        "Transferred case to immediate doctor review queue"
      );
      recordAutonomousCycle({
        totalMs: Date.now() - cycleStart,
        extractionMs,
        riskAnalysisMs,
        questionSelectionMs: 0
      });
      return;
    }
  }

  // 5. REASON: Identify Missing Information
  consultation.missingInformation = getMissingAttributes(consultation);

  // 6. DECIDE: Select Next Dynamic Question
  const qSelectStart = Date.now();
  const nextQ = selectNextQuestion(consultation, language);
  const questionSelectionMs = Date.now() - qSelectStart;

  if (nextQ) {
    consultation.nextQuestion = nextQ;
    consultation.lifecycleState = "INTERVIEWING";
    recordTrace(
      consultation,
      "Next dynamic question selected",
      `Next target attribute: [${nextQ.id}]. Missing attributes count: ${consultation.missingInformation.length}`,
      `Querying patient in ${language.toUpperCase()}`
    );
  } else {
    // Sufficient information collected, complete case taking
    finalizeCase(consultation);
  }

  recordAutonomousCycle({
    totalMs: Date.now() - cycleStart,
    extractionMs,
    riskAnalysisMs,
    questionSelectionMs
  });
}

/**
 * Finalize Case: Route, generate summary, move to doctor review
 */
function finalizeCase(consultation) {
  consultation.missingInformation = getMissingAttributes(consultation);
  consultation.riskAssessment = assessRisk(consultation);
  consultation.priority = consultation.riskAssessment.level;

  // Route to department
  const routing = recommendDepartment(consultation);
  consultation.suggestedDepartment = routing.department;
  consultation.departmentConfidence = routing.confidence;
  consultation.routingReasons = routing.reasons;

  recordTrace(
    consultation,
    "Autonomous department routing",
    `Suggested department: ${routing.department} (Confidence: ${routing.confidence})`,
    "Attached routing rationale to case summary"
  );

  // Generate structured case summary
  consultation.summary = generateCaseSummary(consultation);
  consultation.state = "WAITING_FOR_DOCTOR";
  consultation.lifecycleState = "CASE_GENERATED";
  consultation.nextQuestion = null;
  consultation.updatedAt = now();

  recordTrace(
    consultation,
    "Case sheet generated",
    "Clinical pre-consultation summary compiled and ready for physician review.",
    "Awaiting physician verification and sign-off"
  );
}

/**
 * Trigger staff alert for HIGH priority cases
 */
function triggerStaffAlert(consultation, risk) {
  const db = getDb();
  if (!db.alerts) db.alerts = [];

  const existingAlert = db.alerts.find(a => a.consultationId === consultation.id && !a.acknowledged);
  if (!existingAlert) {
    const alertItem = {
      id: generateId("ALERT"),
      type: "HIGH_PRIORITY_CASE",
      consultationId: consultation.id,
      patientId: consultation.patientId,
      patientName: consultation.patientName,
      priority: "HIGH",
      reason: risk.indicators.join("; ") || "Potential critical warning indicators detected",
      suggestedDepartment: consultation.suggestedDepartment || "Emergency / Cardiology",
      createdAt: now(),
      acknowledged: false
    };
    db.alerts.unshift(alertItem);
    recordTrace(
      consultation,
      "Doctor console staff alert broadcast",
      `Alert ID: ${alertItem.id} dispatched to attending medical staff`,
      "Promoted case to top of doctor queue"
    );
  }
}

/**
 * Ingest Vital Signs into Case State
 */
function updateVitals(consultation, vitalsData) {
  if (!consultation.vitals) consultation.vitals = {};
  Object.assign(consultation.vitals, vitalsData);

  recordTrace(
    consultation,
    "Vital signs integrated",
    `BP: ${vitalsData.bloodPressure || 'N/A'}, HR: ${vitalsData.heartRate || 'N/A'}, SpO2: ${vitalsData.spo2 || 'N/A'}%`,
    "Re-evaluating clinical risk assessment with vital parameters"
  );

  // Re-assess risk with new vitals
  const risk = assessRisk(consultation);
  consultation.riskAssessment = risk;
  consultation.priority = risk.level;

  if (risk.level === "HIGH") {
    triggerStaffAlert(consultation, risk);
  }

  // Update summary if already generated
  if (consultation.summary) {
    consultation.summary = generateCaseSummary(consultation);
  }
  consultation.updatedAt = now();
}

/**
 * Ingest Uploaded Clinical Report
 */
function ingestReport(consultation, reportData) {
  if (!consultation.reports) consultation.reports = [];

  const reportEntry = {
    id: generateId("RPT"),
    fileName: reportData.fileName || "Uploaded_Clinical_Report.pdf",
    fileType: reportData.fileType || "application/pdf",
    extractedText: reportData.extractedText || "Standard clinical report parameters analyzed.",
    uploadedAt: now()
  };

  consultation.reports.push(reportEntry);

  recordTrace(
    consultation,
    "Clinical report ingested",
    `Report [${reportEntry.fileName}] parsed by AI extraction layer.`,
    "Incorporated report findings into clinical summary"
  );

  // Update summary if already generated
  if (consultation.summary) {
    consultation.summary = generateCaseSummary(consultation);
  }
  consultation.updatedAt = now();
  return reportEntry;
}

module.exports = {
  initCaseState,
  recordTrace,
  processPatientResponse,
  finalizeCase,
  triggerStaffAlert,
  updateVitals,
  ingestReport
};
