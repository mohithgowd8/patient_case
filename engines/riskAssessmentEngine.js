/**
 * CAREPATH AI - Risk Assessment Engine (riskAssessmentEngine.js)
 * Evaluates symptoms, symptom combinations, vitals, duration, and severity.
 * Classifies priority into ROUTINE, URGENT, or HIGH.
 * Formulates non-diagnostic preliminary indicators and escalation rationale.
 */

function assessRisk(caseState) {
  const responses = caseState.responses || [];
  const allText = responses
    .map(x => x.answer)
    .join(" ")
    .toLowerCase();

  const chief = (caseState.structured?.chiefComplaint?.value || "").toLowerCase();
  const severityVal = parseInt(caseState.structured?.severity?.value, 10);
  const vitals = caseState.vitals || {};

  const indicators = [];
  const evidence = [];
  const rationale = [];

  let priority = "ROUTINE";

  // Helper to record finding
  const flag = (ind, ev, rat, targetPriority) => {
    indicators.push(ind);
    if (ev && !evidence.includes(ev)) evidence.push(ev);
    if (rat && !rationale.includes(rat)) rationale.push(rat);

    if (targetPriority === "HIGH") {
      priority = "HIGH";
    } else if (targetPriority === "URGENT" && priority !== "HIGH") {
      priority = "URGENT";
    }
  };

  // 1. Cardiovascular / Acute Chest Syndrome Red Flags
  const isChest = chief.includes("chest") || chief.includes("heart") || /chest|heart|छाती|सीने|ఛాతీ|గుండె/i.test(allText);
  const bpMatchInitial = String(vitals.bloodPressure || "").match(/(\d+)\s*\/\s*(\d+)/);
  const sysInit = bpMatchInitial ? parseInt(bpMatchInitial[1], 10) : 0;
  const diaInit = bpMatchInitial ? parseInt(bpMatchInitial[2], 10) : 0;
  const hasHypertensiveChest = isChest && (sysInit >= 160 || diaInit >= 100);

  const hasSevereChest = isChest && (
    severityVal >= 7 ||
    hasHypertensiveChest ||
    /breath|sweat|jaw|arm|shoulder|dizzy|severe|10|9|8/i.test(allText)
  );

  if (hasSevereChest) {
    flag(
      "Acute chest discomfort with high severity or autonomic symptoms",
      responses.find(r => /chest|pain|breath|sweat|arm|jaw/i.test(r.answer))?.answer || "Chest pain with concerning features",
      "Reported symptoms may indicate acute coronary or thoracic emergency. Immediate clinical evaluation is required.",
      "HIGH"
    );
  }

  // 2. Severe Respiratory Distress
  if (
    /difficulty breathing|can't breathe|gasping|severe breathlessness|सांस लेने में बहुत तकलीफ|తీవ్రమైన శ్వాస/i.test(allText) ||
    (vitals.spo2 && Number(vitals.spo2) < 92)
  ) {
    const spo2Evidence = vitals.spo2 ? ` (SpO2: ${vitals.spo2}%)` : "";
    flag(
      "Respiratory compromise / low oxygen saturation",
      (responses.find(r => /breath|सांस|శ్వాస/i.test(r.answer))?.answer || "Severe shortness of breath") + spo2Evidence,
      "Significant breathing difficulty or SpO2 < 92% requires prompt clinical triage and airway evaluation.",
      "HIGH"
    );
  } else if (/breath|shortness of breath|सांस|శ్వాస/i.test(allText) || (vitals.spo2 && Number(vitals.spo2) <= 94)) {
    flag(
      "Mild to moderate shortness of breath",
      responses.find(r => /breath|सांस|శ్వాస/i.test(r.answer))?.answer || "Breathing discomfort reported",
      "Shortness of breath reported without immediate respiratory failure criteria.",
      "URGENT"
    );
  }

  // 3. Neurological / Syncope / Altered Sensorium
  if (
    /unconscious|fainted|blackout|seizure|convulsion|stroke|face drooping|slurred speech|बेहोश|दौरा|స్పృహ తప్పడం/i.test(allText)
  ) {
    flag(
      "Transient loss of consciousness or acute neurological deficit",
      responses.find(r => /unconscious|faint|blackout|seizure|बेहोश|స్పృహ/i.test(r.answer))?.answer || "Loss of consciousness reported",
      "Sudden neurological compromise requires immediate professional medical assessment.",
      "HIGH"
    );
  }

  // 4. Significant Hemorrhage / Hematemesis
  if (
    /severe bleeding|blood vomiting|vomiting blood|coughing blood|hemoptysis|खून की उल्टी|రక్తం వాంతులు/i.test(allText)
  ) {
    flag(
      "Active or significant bleeding",
      responses.find(r => /bleed|blood|खून|రక్తం/i.test(r.answer))?.answer || "Bleeding reported",
      "Reported gastrointestinal or pulmonary hemorrhage requires urgent clinical evaluation.",
      "HIGH"
    );
  }

  // 5. Vital Sign Indicators
  if (vitals.heartRate) {
    const hr = Number(vitals.heartRate);
    if (hr >= 130 || hr < 45) {
      flag(
        `Critical Heart Rate: ${hr} BPM`,
        `Heart rate recorded at ${hr} BPM`,
        "Marked tachycardia or severe bradycardia represents a potential hemodynamic warning sign.",
        "HIGH"
      );
    } else if (hr >= 105 || hr < 55) {
      flag(
        `Elevated / Low Heart Rate: ${hr} BPM`,
        `Heart rate recorded at ${hr} BPM`,
        "Heart rate is outside standard resting boundaries.",
        "URGENT"
      );
    }
  }

  if (vitals.bloodPressure) {
    const bpMatch = String(vitals.bloodPressure).match(/(\d+)\s*\/\s*(\d+)/);
    if (bpMatch) {
      const systolic = parseInt(bpMatch[1], 10);
      const diastolic = parseInt(bpMatch[2], 10);
      if (systolic >= 180 || diastolic >= 120) {
        flag(
          `Severe Hypertension (${systolic}/${diastolic} mmHg)`,
          `Blood pressure: ${systolic}/${diastolic}`,
          "Hypertensive urgency/emergency thresholds observed.",
          "HIGH"
        );
      } else if (systolic >= 145 || diastolic >= 95) {
        flag(
          `Elevated Blood Pressure (${systolic}/${diastolic} mmHg)`,
          `Blood pressure: ${systolic}/${diastolic}`,
          "Blood pressure elevation noted.",
          "URGENT"
        );
      }
    }
  }

  if (vitals.temperature) {
    const temp = Number(vitals.temperature);
    const isFahrenheit = temp > 45;
    const isHighFever = isFahrenheit ? temp >= 103.0 : temp >= 39.4;
    if (isHighFever) {
      flag(
        `High Grade Fever (${temp}°${isFahrenheit ? 'F' : 'C'})`,
        `Temperature recorded at ${temp}°${isFahrenheit ? 'F' : 'C'}`,
        "High pyrexia may indicate significant systemic infection or inflammatory process.",
        "URGENT"
      );
    }
  }

  // 6. High Severity without clear high-priority flag
  if (severityVal >= 8 && priority === "ROUTINE") {
    flag(
      `High reported pain severity (${severityVal}/10)`,
      `Severity rated as ${severityVal}/10`,
      "High pain score requires timely medical evaluation for pain etiology and relief.",
      "URGENT"
    );
  }

  // Action recommendation
  let action = "Standard consultation scheduling appropriate.";
  if (priority === "HIGH") {
    action = "Immediate medical staff notification & priority triage required.";
  } else if (priority === "URGENT") {
    action = "Prompt medical evaluation recommended.";
  }

  return {
    level: priority,
    indicators,
    evidence,
    rationale,
    action,
    disclaimer: "Preliminary AI Risk Assessment — not a diagnosis. Requires evaluation by a qualified healthcare professional."
  };
}

module.exports = {
  assessRisk
};
