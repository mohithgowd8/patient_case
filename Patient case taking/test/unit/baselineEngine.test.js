/**
 * CAREPATH AI - Fixed Baseline & Clinical Benchmark Engine Unit Tests (baselineEngine.test.js)
 * 
 * Verifies:
 * - 20-question fixed checklist invariance
 * - Question reduction ratio computation
 * - Clinical relevance evaluation (autonomous vs baseline)
 * - Triage time-to-decision savings estimation
 */

const test = require("node:test");
const assert = require("node:assert");

const {
  FIXED_QUESTIONNAIRE_BASELINE,
  runFixedQuestionBaseline
} = require("../../engines/baselineEngine");

test("Baseline Engine - Fixed 20-Question Invariance", () => {
  assert.strictEqual(FIXED_QUESTIONNAIRE_BASELINE.length, 20);
  assert.ok(FIXED_QUESTIONNAIRE_BASELINE.every(q => q.id && q.text && q.category));
  assert.strictEqual(FIXED_QUESTIONNAIRE_BASELINE[0].id, "base_01");
  assert.strictEqual(FIXED_QUESTIONNAIRE_BASELINE[19].id, "base_20");
});

test("Baseline Engine - Empirical Benchmark Comparison for Routine Case", () => {
  const consultation = {
    id: "CONS-BENCH-01",
    complaintCategory: "gastrointestinal",
    responses: [
      { questionId: "chief", answer: "Abdominal cramps and acidity after dinner" },
      { questionId: "onset", answer: "Started 4 hours ago" },
      { questionId: "severity", answer: "Rating is 4" }
    ],
    caseState: {
      completionReason: "SUFFICIENT_INFORMATION"
    }
  };

  const benchmark = runFixedQuestionBaseline(consultation);

  // Autonomous metrics
  assert.strictEqual(benchmark.autonomous.questionsAsked, 3);
  assert.strictEqual(benchmark.autonomous.completionReason, "SUFFICIENT_INFORMATION");
  assert.ok(benchmark.autonomous.relevanceRatePercent > 90);

  // Fixed baseline metrics
  assert.strictEqual(benchmark.fixedBaseline.questionsAsked, 20);
  assert.strictEqual(benchmark.fixedBaseline.timeEstimateMinutes, 15.0);

  // Comparative savings
  assert.strictEqual(benchmark.comparison.questionReductionPercent, 85);
  assert.strictEqual(benchmark.comparison.timeSavedMinutes, 13.5);
  assert.ok(benchmark.comparison.relevanceImprovementPercent > 0);
  assert.ok(benchmark.comparison.conclusion.includes("85%"));
});

test("Baseline Engine - Empirical Benchmark Comparison for High Risk Escalated Case", () => {
  const consultation = {
    id: "CONS-BENCH-02",
    complaintCategory: "cardiovascular",
    priority: "HIGH",
    responses: [
      { questionId: "chief", answer: "Severe chest pain radiating to jaw and arm" },
      { questionId: "onset", answer: "Started suddenly 30 minutes ago" }
    ],
    caseState: {
      completionReason: "HIGH_RISK_ESCALATION"
    }
  };

  const benchmark = runFixedQuestionBaseline(consultation);

  assert.strictEqual(benchmark.autonomous.questionsAsked, 2);
  assert.strictEqual(benchmark.autonomous.completionReason, "HIGH_RISK_ESCALATION");
  assert.strictEqual(benchmark.comparison.questionReductionPercent, 90);
  assert.strictEqual(benchmark.comparison.timeSavedMinutes, 14.0);
  assert.ok(benchmark.comparison.conclusion.includes("emergency handover"));
});
