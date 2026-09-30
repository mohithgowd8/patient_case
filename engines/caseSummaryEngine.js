/**
 * CAREPATH AI - Case Summary Engine (caseSummaryEngine.js)
 * Formats a structured, doctor-ready clinical pre-consultation summary sheet.
 * Explicitly marks missing fields as 'Not provided' rather than inventing data.
 */

function generateCaseSummary(caseState) {
  const s = caseState.structured || {};
  const v = caseState.vitals || {};
  const p = caseState.patient || {};
  const risk = caseState.riskAssessment || {};

  const get = field => {
    const val = s[field]?.value;
    return val && String(val).trim() ? String(val).trim() : "Not provided";
  };

  const getVital = (field, unit = "") => {
    const val = v[field];
    return val ? `${val} ${unit}`.trim() : "Not recorded";
  };

  const lines = [
    "============================================================",
    "  CAREPATH AI · CLINICAL PRE-CONSULTATION CASE SUMMARY",
    "  Intelligent Systems & Autonomous Computing",
    "============================================================",
    "",
    "1. PATIENT DEMOGRAPHICS",
    `   • Name: ${p.name || s.patientName?.value || "Not provided"}`,
    `   • Age: ${p.age || s.age?.value || "Not provided"}`,
    `   • Gender: ${p.gender || s.gender?.value || "Not provided"}`,
    `   • Consultation Date: ${caseState.appointmentDate || "Today"}`,
    "",
    "2. CHIEF COMPLAINT & SYMPTOM PROFILE",
    `   • Primary Complaint: ${get("chiefComplaint")}`,
    `   • Category: ${caseState.complaintCategory ? caseState.complaintCategory.toUpperCase() : "GENERAL"}`,
    `   • Duration / Onset: ${get("onset")}`,
    `   • Severity (1-10): ${get("severity")}`,
    `   • Location: ${get("location")}`,
    `   • Radiation: ${get("radiation")}`,
    `   • Associated Symptoms: ${get("associatedSymptoms")}`,
    "",
    "3. MEDICAL BACKGROUND",
    `   • Past Medical History: ${get("pastHistory")}`,
    `   • Current Medications: ${get("medications")}`,
    `   • Allergies: ${get("allergies")}`,
    "",
    "4. RECORDED VITAL SIGNS",
    `   • Blood Pressure: ${getVital("bloodPressure")}`,
    `   • Heart Rate: ${getVital("heartRate", "BPM")}`,
    `   • SpO2: ${getVital("spo2", "%")}`,
    `   • Temperature: ${getVital("temperature", "°F")}`,
    `   • Respiratory Rate: ${getVital("respiratoryRate", "breaths/min")}`,
    "",
    "5. PRELIMINARY AI RISK ASSESSMENT",
    `   • Preliminary Risk Level: ${caseState.priority === 'HIGH' ? 'HIGH PRIORITY' : (caseState.priority || "ROUTINE")}`,
    `   • Suggested Department: ${caseState.suggestedDepartment || "General Medicine"}`,
    `   • Detected Warning Indicators:`,
    ...(risk.indicators && risk.indicators.length > 0
      ? risk.indicators.map(ind => `     - ⚠️ ${ind}`)
      : ["     - None detected from available responses."]),
    `   • Escalation Action: ${risk.action || "Standard consultation schedule"}`,
    "",
    "6. MISSING / UNCONFIRMED CLINICAL DATA",
    ...(caseState.missingInformation && caseState.missingInformation.length > 0
      ? caseState.missingInformation.map(m => `   • ${m}`)
      : ["   • Comprehensive initial profile collected"]),
    "",
    "7. CLINICAL REVIEW NOTICE",
    "   * This AI case sheet is for decision-support and history taking only.",
    "   * The doctor remains the final diagnostic and clinical authority.",
    "============================================================"
  ];

  return lines.join("\n");
}

module.exports = {
  generateCaseSummary
};
