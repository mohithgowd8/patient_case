/**
 * CAREPATH AI - Case State Engine Unit Tests (caseStateEngine.test.js)
 * 
 * Verifies:
 * - Canonical case state initialization
 * - Linguistic uncertainty detection
 * - Testimony contradiction detection
 * - Missing clinical information detection
 * - Clinical information sufficiency
 * - Stopping conditions (high risk escalation, sufficiency, question ceiling)
 */

const test = require("node:test");
const assert = require("node:assert");

const {
  initializeCaseState,
  detectUncertainty,
  detectContradictions,
  detectMissingInformation,
  isInformationSufficient,
  shouldStopQuestioning,
  updateCaseState
} = require("../../engines/caseStateEngine");

test("Case State Engine - Initialization & Canonical Schema", () => {
  const consultation = { id: "CONS-TEST-001" };
  const patient = { id: "PAT-001", name: "Ramesh Sharma", age: 54, gender: "Male" };

  const state = initializeCaseState(consultation, patient);

  assert.strictEqual(state.consultationId, "CONS-TEST-001");
  assert.strictEqual(state.patientName, "Ramesh Sharma");
  assert.strictEqual(state.age, 54);
  assert.strictEqual(state.questionCount, 0);
  assert.strictEqual(state.status, "QUESTIONING");
  assert.strictEqual(state.risk.level, "ROUTINE");
  assert.deepStrictEqual(state.answeredQuestions, []);
  assert.deepStrictEqual(state.uncertainInformation, []);
  assert.deepStrictEqual(state.contradictoryInformation, []);
});

test("Case State Engine - Linguistic Uncertainty Detection", () => {
  const vagueText1 = "I think it might be maybe around 2 days ago, not sure.";
  const uncertainties1 = detectUncertainty(vagueText1, "onset");
  assert.strictEqual(uncertainties1.length, 1);
  assert.strictEqual(uncertainties1[0].confidence, "LOW");
  assert.ok(["maybe", "not sure", "i think", "might be", "around"].includes(uncertainties1[0].marker));

  const vagueTextHindi = "shayad kal se dard ho raha hai";
  const uncertaintiesHindi = detectUncertainty(vagueTextHindi, "onset");
  assert.strictEqual(uncertaintiesHindi.length, 1);
  assert.strictEqual(uncertaintiesHindi[0].marker, "shayad");

  const confidentText = "Pain started exactly at 4 PM while climbing stairs.";
  const uncertainties2 = detectUncertainty(confidentText, "onset");
  assert.strictEqual(uncertainties2.length, 0);
});

test("Case State Engine - Testimony Contradiction Detection", () => {
  const state = initializeCaseState({ id: "CONS-TEST-002" }, { name: "Ananya", age: 29 });
  state.extractedEntities.symptoms = ["severe chest pain"];
  state.answeredQuestions = ["chief"];

  // Patient later says they have no pain
  const contradictoryExtracted = { symptoms: [] };
  const contradictoryText = "I don't have any pain actually, I am completely fine.";

  const contradictions = detectContradictions(state, contradictoryExtracted, contradictoryText);
  assert.strictEqual(contradictions.length, 1);
  assert.strictEqual(contradictions[0].attribute, "symptoms");
  assert.ok(contradictions[0].explanation.includes("initially reported symptoms"));

  // Non-contradictory follow-up
  const normalText = "The pain spreads down my left arm.";
  const normalExtracted = { symptoms: ["radiating pain"] };
  const noContradictions = detectContradictions(state, normalExtracted, normalText);
  assert.strictEqual(noContradictions.length, 0);
});

test("Case State Engine - Missing Information Detection", () => {
  const state = initializeCaseState({ id: "CONS-TEST-003" }, { name: "Pooja", age: 34 });

  const missing = detectMissingInformation(state);
  assert.ok(missing.includes("chief_complaint"));
  assert.ok(missing.includes("onset_and_duration"));
  assert.ok(missing.includes("severity_score"));
  assert.ok(missing.includes("character_and_location"));
  assert.ok(missing.includes("associated_warning_signs"));
  assert.ok(missing.includes("medical_history"));

  // Supply onset, severity, and symptoms
  state.extractedEntities.symptoms = ["chest pain"];
  state.extractedEntities.duration = "2 hours";
  state.extractedEntities.severity = 7;

  const missingUpdated = detectMissingInformation(state);
  assert.ok(!missingUpdated.includes("chief_complaint"));
  assert.ok(!missingUpdated.includes("onset_and_duration"));
  assert.ok(!missingUpdated.includes("severity_score"));
  assert.ok(missingUpdated.includes("character_and_location"));
});

test("Case State Engine - Sufficiency & Stopping Conditions", () => {
  const state = initializeCaseState({ id: "CONS-TEST-004" }, { name: "Vijay", age: 42 });

  // 1. Initially questioning should NOT stop
  assert.strictEqual(shouldStopQuestioning(state).stop, false);
  assert.strictEqual(isInformationSufficient(state), false);

  // 2. High Risk Immediate Halting after initial presentation gathered
  state.risk.level = "HIGH";
  state.questionCount = 2;
  const highRiskStop = shouldStopQuestioning(state);
  assert.strictEqual(highRiskStop.stop, true);
  assert.strictEqual(highRiskStop.reason, "HIGH_RISK_ESCALATION");

  // 3. Question Ceiling Halting
  state.risk.level = "ROUTINE";
  state.questionCount = 6;
  const maxQuestionStop = shouldStopQuestioning(state, 6);
  assert.strictEqual(maxQuestionStop.stop, true);
  assert.strictEqual(maxQuestionStop.reason, "MAX_QUESTIONS_REACHED");

  // 4. Clinical Sufficiency Halting
  state.questionCount = 3;
  state.extractedEntities.symptoms = ["headache"];
  state.extractedEntities.duration = "3 days";
  state.extractedEntities.severity = 4;
  assert.strictEqual(isInformationSufficient(state), true);

  const sufficiencyStop = shouldStopQuestioning(state, 6);
  assert.strictEqual(sufficiencyStop.stop, true);
  assert.strictEqual(sufficiencyStop.reason, "SUFFICIENT_INFORMATION");
});

test("Case State Engine - Update State Flow", () => {
  const state = initializeCaseState({ id: "CONS-TEST-005" }, { name: "Deepak", age: 38 });

  updateCaseState(
    state,
    { questionId: "onset", answer: "Started 3 hours ago" },
    { duration: "3 hours", severity: null, symptoms: [] }
  );

  assert.strictEqual(state.questionCount, 1);
  assert.ok(state.answeredQuestions.includes("onset"));
  assert.strictEqual(state.extractedEntities.duration, "3 hours");
});
