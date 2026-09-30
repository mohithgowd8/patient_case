/**
 * CAREPATH AI - Explicit Case State Engine (caseStateEngine.js)
 * 
 * Manages the canonical state representation for autonomous intelligent patient case-taking.
 * Tracks extracted clinical entities, identifies missing parameters, detects uncertainty and contradictions,
 * and evaluates deterministic clinical stopping criteria.
 * 
 * @module engines/caseStateEngine
 */

/**
 * @typedef {Object} ExtractedEntities
 * @property {string[]} symptoms
 * @property {string|null} duration
 * @property {number|null} severity
 * @property {string|null} location
 * @property {string|null} radiation
 * @property {string[]} associatedSymptoms
 * @property {string[]} history
 * @property {string[]} medications
 * @property {string[]} allergies
 * @property {Record<string, any>} vitals
 */

/**
 * @typedef {Object} ContradictionItem
 * @property {string} attribute
 * @property {string} previousValue
 * @property {string} currentValue
 * @property {string} explanation
 * @property {string} timestamp
 */

/**
 * @typedef {Object} UncertaintyItem
 * @property {string} attribute
 * @property {string} rawText
 * @property {"LOW"|"MEDIUM"|"HIGH"} confidence
 * @property {string} marker
 */

/**
 * @typedef {Object} CaseState
 * @property {string} consultationId
 * @property {string} patientId
 * @property {string} patientName
 * @property {number|null} age
 * @property {string|null} gender
 * @property {string} rawNarrative
 * @property {ExtractedEntities} extractedEntities
 * @property {string[]} missingInformation
 * @property {UncertaintyItem[]} uncertainInformation
 * @property {ContradictionItem[]} contradictoryInformation
 * @property {string[]} answeredQuestions
 * @property {Array<{questionId: string, score: number, question: string}>} candidateQuestions
 * @property {Object|null} selectedQuestion
 * @property {{level: "ROUTINE"|"URGENT"|"HIGH", score: number, factors: string[]}} risk
 * @property {Array<Object>} decisionTrace
 * @property {number} questionCount
 * @property {"QUESTIONING"|"COMPLETED"|"ESCALATED"} status
 * @property {"SUFFICIENT_INFORMATION"|"HIGH_RISK_ESCALATION"|"MAX_QUESTIONS_REACHED"|"DOCTOR_REVIEW_REQUIRED"|null} completionReason
 * @property {string} createdAt
 * @property {string} updatedAt
 */

const UNCERTAINTY_MARKERS = [
  "maybe", "perhaps", "i think", "not sure", "probably", "possibly",
  "around", "approx", "roughly", "might be", "could be", "don't know",
  "dont know", "hard to say", "lagbhag", "shayad", "anukuntunna"
];

/**
 * Initializes a new canonical case state.
 * 
 * Preconditions:
 * - consultation must be a valid object with an id
 * 
 * Invariants:
 * - missingInformation always starts with core clinical intake dimensions
 * - status defaults to "QUESTIONING"
 * 
 * Complexity: O(1)
 * 
 * @param {Object} consultation 
 * @param {Object} [user] 
 * @returns {CaseState}
 */
function initializeCaseState(consultation, user = null) {
  const now = new Date().toISOString();
  return {
    consultationId: consultation.id || "CONS-" + Date.now(),
    patientId: user?.id || consultation.patientId || "pat-anon",
    patientName: user?.name || consultation.patientName || "Anonymous Patient",
    age: user?.age || consultation.structured?.age?.value || null,
    gender: user?.gender || consultation.structured?.gender?.value || null,
    rawNarrative: "",
    extractedEntities: {
      symptoms: [],
      duration: null,
      severity: null,
      location: null,
      radiation: null,
      associatedSymptoms: [],
      history: [],
      medications: [],
      allergies: [],
      vitals: consultation.vitals || {}
    },
    missingInformation: [
      "chief_complaint",
      "onset_and_duration",
      "severity_score",
      "character_and_location",
      "associated_warning_signs",
      "medical_history"
    ],
    uncertainInformation: [],
    contradictoryInformation: [],
    answeredQuestions: [],
    candidateQuestions: [],
    selectedQuestion: null,
    risk: {
      level: "ROUTINE",
      score: 0,
      factors: []
    },
    decisionTrace: [],
    questionCount: 0,
    status: "QUESTIONING",
    completionReason: null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Detects linguistic markers indicating uncertainty in patient testimony.
 * 
 * @param {string} text 
 * @param {string} [attribute="general"]
 * @returns {UncertaintyItem[]}
 */
function detectUncertainty(text, attribute = "general") {
  if (!text || typeof text !== "string") return [];
  const lower = text.toLowerCase();
  const detected = [];

  for (const marker of UNCERTAINTY_MARKERS) {
    if (lower.includes(marker)) {
      detected.push({
        attribute,
        rawText: text,
        confidence: "LOW",
        marker
      });
      break;
    }
  }

  return detected;
}

/**
 * Detects contradictory claims between new entities and previously recorded case state.
 * 
 * @param {CaseState} state 
 * @param {Object} newEntities 
 * @param {string} responseText 
 * @returns {ContradictionItem[]}
 */
function detectContradictions(state, newEntities, responseText) {
  const contradictions = [];
  const lower = (responseText || "").toLowerCase();

  // 1. Duration / Onset Contradiction
  if (state.extractedEntities.duration && newEntities.duration) {
    const prev = String(state.extractedEntities.duration).toLowerCase();
    const curr = String(newEntities.duration).toLowerCase();

    const isPrevShort = prev.includes("hour") || prev.includes("minute") || prev.includes("today") || prev.includes("morning");
    const isCurrLong = curr.includes("week") || curr.includes("month") || curr.includes("year");
    const isPrevLong = prev.includes("week") || prev.includes("month") || prev.includes("year");
    const isCurrShort = curr.includes("hour") || curr.includes("minute") || curr.includes("today") || curr.includes("morning");

    if ((isPrevShort && isCurrLong) || (isPrevLong && isCurrShort)) {
      contradictions.push({
        attribute: "duration",
        previousValue: state.extractedEntities.duration,
        currentValue: newEntities.duration,
        explanation: `Contradictory onset timeline: previously stated '${state.extractedEntities.duration}', but later reported '${newEntities.duration}'.`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 2. Severity Contradiction (e.g. earlier reported 9/10, then claims mild / 2/10)
  if (typeof state.extractedEntities.severity === "number" && typeof newEntities.severity === "number") {
    const diff = Math.abs(state.extractedEntities.severity - newEntities.severity);
    if (diff >= 5) {
      contradictions.push({
        attribute: "severity",
        previousValue: String(state.extractedEntities.severity),
        currentValue: String(newEntities.severity),
        explanation: `Substantial variance in pain severity scale: shifted from ${state.extractedEntities.severity}/10 to ${newEntities.severity}/10.`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 3. Symptom Denial Contradiction
  if ((state.extractedEntities.symptoms || []).length > 0) {
    if (/no pain|don't have any pain|dont have any pain|no symptoms|completely fine/i.test(lower)) {
      contradictions.push({
        attribute: "symptoms",
        previousValue: state.extractedEntities.symptoms.join(", "),
        currentValue: "Denies symptoms/pain",
        explanation: `Patient denies pain or symptoms after having initially reported symptoms: '${state.extractedEntities.symptoms.join(", ")}'.`,
        timestamp: new Date().toISOString()
      });
    }
  }

  return contradictions;
}

/**
 * Re-evaluates missing clinical intake dimensions based on current state.
 * 
 * @param {CaseState} state 
 * @returns {string[]}
 */
function detectMissingInformation(state) {
  const missing = [];
  const entities = state.extractedEntities;

  if (!entities.symptoms || entities.symptoms.length === 0) {
    missing.push("chief_complaint");
  }
  if (!entities.duration) {
    missing.push("onset_and_duration");
  }
  if (entities.severity === null || entities.severity === undefined) {
    missing.push("severity_score");
  }
  if (!entities.location && !entities.radiation) {
    missing.push("character_and_location");
  }
  if (!entities.associatedSymptoms || entities.associatedSymptoms.length === 0) {
    missing.push("associated_warning_signs");
  }
  if (!entities.history || entities.history.length === 0) {
    missing.push("medical_history");
  }

  state.missingInformation = missing;
  return missing;
}

/**
 * Checks whether the collected information meets clinical sufficiency benchmarks.
 * 
 * Sufficiency Criteria:
 * 1. Chief complaint identified
 * 2. Onset / duration recorded
 * 3. Severity documented
 * 4. At least one associated warning sign / negative confirmed
 * 5. Minimum 3 questions answered
 * 
 * @param {CaseState} state 
 * @returns {boolean}
 */
function isInformationSufficient(state) {
  const entities = state.extractedEntities;
  const hasChief = Boolean(entities.symptoms && entities.symptoms.length > 0);
  const hasDuration = Boolean(entities.duration);
  const hasSeverity = entities.severity !== null && entities.severity !== undefined;
  const hasMinQuestions = state.questionCount >= 3;

  return hasChief && hasDuration && hasSeverity && hasMinQuestions;
}

/**
 * Evaluates whether autonomous questioning should stop.
 * 
 * @param {CaseState} state 
 * @param {number} [maxQuestions=6] 
 * @returns {{stop: boolean, reason: string|null}}
 */
function shouldStopQuestioning(state, maxQuestions = 6) {
  // 1. High Risk Immediate Halting (Emergency Safety Policy: halt once acute presentation + follow-up is gathered)
  if (state.risk.level === "HIGH" && state.questionCount >= 2) {
    return {
      stop: true,
      reason: "HIGH_RISK_ESCALATION"
    };
  }

  // 2. Maximum Question Ceiling Reached
  if (state.questionCount >= maxQuestions) {
    return {
      stop: true,
      reason: "MAX_QUESTIONS_REACHED"
    };
  }

  // 3. Clinical Sufficiency Benchmark Achieved
  if (isInformationSufficient(state)) {
    return {
      stop: true,
      reason: "SUFFICIENT_INFORMATION"
    };
  }

  return {
    stop: false,
    reason: null
  };
}

/**
 * Updates case state with newly extracted clinical entities and patient answers.
 * 
 * @param {CaseState} state 
 * @param {Object} responseObj 
 * @param {Object} extracted 
 * @returns {CaseState}
 */
function updateCaseState(state, responseObj, extracted) {
  state.updatedAt = new Date().toISOString();
  state.questionCount++;

  if (responseObj.questionId && !state.answeredQuestions.includes(responseObj.questionId)) {
    state.answeredQuestions.push(responseObj.questionId);
  }

  state.rawNarrative += (state.rawNarrative ? " | " : "") + responseObj.answer;

  // 1. Detect Uncertainty
  const uncertainties = detectUncertainty(responseObj.answer, responseObj.questionId);
  if (uncertainties.length > 0) {
    state.uncertainInformation.push(...uncertainties);
  }

  // 2. Detect Contradictions
  const contradictions = detectContradictions(state, extracted, responseObj.answer);
  if (contradictions.length > 0) {
    state.contradictoryInformation.push(...contradictions);
  }

  // 3. Merge Entities
  if (extracted.symptoms && Array.isArray(extracted.symptoms)) {
    for (const s of extracted.symptoms) {
      if (!state.extractedEntities.symptoms.includes(s)) {
        state.extractedEntities.symptoms.push(s);
      }
    }
  }

  if (extracted.duration && !state.extractedEntities.duration) {
    state.extractedEntities.duration = extracted.duration;
  }

  if (typeof extracted.severity === "number") {
    state.extractedEntities.severity = extracted.severity;
  }

  if (extracted.location && !state.extractedEntities.location) {
    state.extractedEntities.location = extracted.location;
  }

  if (extracted.radiation && !state.extractedEntities.radiation) {
    state.extractedEntities.radiation = extracted.radiation;
  }

  if (extracted.associatedSymptoms && Array.isArray(extracted.associatedSymptoms)) {
    for (const a of extracted.associatedSymptoms) {
      if (!state.extractedEntities.associatedSymptoms.includes(a)) {
        state.extractedEntities.associatedSymptoms.push(a);
      }
    }
  }

  if (extracted.history && Array.isArray(extracted.history)) {
    for (const h of extracted.history) {
      if (!state.extractedEntities.history.includes(h)) {
        state.extractedEntities.history.push(h);
      }
    }
  }

  // 4. Update Missing Attributes
  detectMissingInformation(state);

  return state;
}

module.exports = {
  initializeCaseState,
  updateCaseState,
  detectMissingInformation,
  detectUncertainty,
  detectContradictions,
  isInformationSufficient,
  shouldStopQuestioning
};
