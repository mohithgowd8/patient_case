/**
 * CAREPATH AI - Clinician Feedback Engine (feedbackEngine.js)
 * Records and analyzes doctor corrections to AI priority and department routing.
 * Computes agreement rates and flags pattern discrepancies for human review
 * without unsafe automatic model retraining.
 */

const { getDb, saveDb, generateId, now } = require("./dataStore");

function recordFeedback({
  consultationId,
  doctorId,
  doctorName,
  aiPriority,
  doctorPriority,
  aiDepartment,
  doctorDepartment,
  feedbackNotes = ""
}) {
  const db = getDb();
  if (!db.feedback) db.feedback = [];

  const entry = {
    id: generateId("FB"),
    consultationId,
    doctorId,
    doctorName: doctorName || "Attending Physician",
    aiPriority,
    doctorPriority: doctorPriority || aiPriority,
    priorityChanged: doctorPriority && doctorPriority !== aiPriority,
    aiDepartment,
    doctorDepartment: doctorDepartment || aiDepartment,
    departmentChanged: doctorDepartment && doctorDepartment !== aiDepartment,
    feedbackNotes: String(feedbackNotes || "").trim(),
    timestamp: now()
  };

  db.feedback.push(entry);
  saveDb();
  return entry;
}

function analyzeFeedbackPatterns() {
  const db = getDb();
  const feedbackList = db.feedback || [];
  const total = feedbackList.length;

  if (total === 0) {
    return {
      totalFeedbackCount: 0,
      priorityAgreementRate: 100,
      departmentAgreementRate: 100,
      departmentOverridePatterns: {},
      insights: ["No clinician overrides recorded yet."]
    };
  }

  let priorityMatches = 0;
  let departmentMatches = 0;
  const deptOverrides = {};

  for (const f of feedbackList) {
    if (!f.priorityChanged) priorityMatches++;
    if (!f.departmentChanged) {
      departmentMatches++;
    } else {
      const key = `${f.aiDepartment} → ${f.doctorDepartment}`;
      deptOverrides[key] = (deptOverrides[key] || 0) + 1;
    }
  }

  const priorityAgreementRate = Math.round((priorityMatches / total) * 100);
  const departmentAgreementRate = Math.round((departmentMatches / total) * 100);

  const insights = [];
  if (priorityAgreementRate < 80) {
    insights.push(`Clinician priority agreement is ${priorityAgreementRate}%. Review clinical urgency weighting.`);
  } else {
    insights.push(`High clinician priority concordance (${priorityAgreementRate}%).`);
  }

  for (const [pattern, count] of Object.entries(deptOverrides)) {
    if (count >= 2) {
      insights.push(`Repeated department correction: "${pattern}" (${count} times). Clinical routing rule review recommended.`);
    }
  }

  return {
    totalFeedbackCount: total,
    priorityAgreementRate,
    departmentAgreementRate,
    departmentOverridePatterns: deptOverrides,
    insights
  };
}

module.exports = {
  recordFeedback,
  analyzeFeedbackPatterns
};
