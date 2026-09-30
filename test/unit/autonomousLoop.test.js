const test = require("node:test");
const assert = require("node:assert");

const {
  initCaseState,
  processPatientResponse,
  updateVitals
} = require("../../engines/autonomousDecisionEngine");

test("Master Autonomous Decision Loop (OBSERVE → ANALYZE → DECIDE → ACT)", async (t) => {
  await t.test("executes complete autonomous multi-turn consultation cycle", () => {
    // 1. Initial State
    const consultation = {
      id: "CONS-CYCLE-01",
      patientId: "PAT-001",
      patientName: "Kavita Singh",
      responses: []
    };

    initCaseState(consultation, { id: "PAT-001", name: "Kavita Singh", age: 48, gender: "Female" });
    assert.strictEqual(consultation.priority, "ROUTINE");
    assert.ok(consultation.decisionTrace.length > 0);

    // TURN 1: Patient reports chief complaint
    // OBSERVE & ANALYZE
    processPatientResponse(consultation, "chief", "I am having chest tightness and sweating", "text", "en");

    // DECIDE & ACT
    assert.strictEqual(consultation.complaintCategory, "cardiovascular");
    assert.ok(consultation.nextQuestion, "AI autonomously selected next question");
    assert.strictEqual(consultation.nextQuestion.id, "onset");
    assert.ok(consultation.decisionTrace.some(t => t.event.includes("Complaint category identified")));

    // TURN 2: Patient answers onset
    consultation.responses.push({ questionId: "onset", answer: "Started 1 hour ago while walking" });
    processPatientResponse(consultation, "onset", "Started 1 hour ago while walking", "text", "en");

    // DECIDE & ACT: Should select severity
    assert.strictEqual(consultation.structured.onset.value, "Started 1 hour ago while walking");
    assert.strictEqual(consultation.nextQuestion.id, "severity");

    // TURN 3: Patient reports high severity + shortness of breath
    consultation.responses.push({ questionId: "severity", answer: "It is an 8 out of 10 and I can't catch my breath" });
    processPatientResponse(consultation, "severity", "It is an 8 out of 10 and I can't catch my breath", "text", "en");

    // REASON & ESCALATE:
    assert.strictEqual(consultation.priority, "HIGH");
    assert.strictEqual(consultation.lifecycleState, "CASE_GENERATED");
    assert.strictEqual(consultation.suggestedDepartment, "Emergency / Cardiology");
    assert.ok(consultation.decisionTrace.some(t => t.event.includes("interview accelerated")));
    assert.ok(consultation.summary.includes("HIGH PRIORITY"));
  });

  await t.test("re-evaluates risk dynamically when vitals are integrated", () => {
    const consultation = {
      id: "CONS-VITALS-01",
      responses: [{ questionId: "chief", answer: "Cough and breathing tightness" }]
    };
    initCaseState(consultation, { name: "Anil", age: 52 });
    processPatientResponse(consultation, "chief", "Cough and breathing tightness", "text", "en");

    // Initially general/urgent
    assert.notStrictEqual(consultation.priority, "HIGH");

    // Integrate dangerously low SpO2
    updateVitals(consultation, { spo2: "88", heartRate: "128" });

    // Should autonomously escalate to HIGH
    assert.strictEqual(consultation.priority, "HIGH");
    assert.ok(consultation.decisionTrace.some(t => t.event.includes("Vital signs integrated")));
  });
});
