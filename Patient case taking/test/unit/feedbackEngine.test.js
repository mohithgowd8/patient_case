const test = require("node:test");
const assert = require("node:assert");

const { recordFeedback, analyzeFeedbackPatterns } = require("../../engines/feedbackEngine");

test("Clinician Feedback & Learning Layer Engine", async (t) => {
  await t.test("records clinician override and detects discrepancy", () => {
    const feedback = recordFeedback({
      consultationId: "CONS-TEST-001",
      doctorId: "doc-1",
      doctorName: "Dr. Sharma",
      aiPriority: "HIGH",
      doctorPriority: "URGENT",
      aiDepartment: "Cardiology",
      doctorDepartment: "General Medicine",
      feedbackNotes: "Patient has musculoskeletal chest wall pain, not acute ischemia."
    });

    assert.strictEqual(feedback.consultationId, "CONS-TEST-001");
    assert.strictEqual(feedback.priorityChanged, true);
    assert.strictEqual(feedback.departmentChanged, true);
    assert.strictEqual(feedback.feedbackNotes, "Patient has musculoskeletal chest wall pain, not acute ischemia.");
  });

  await t.test("computes agreement rates and generates human review insights", () => {
    const metrics = analyzeFeedbackPatterns();
    assert.ok(typeof metrics.totalFeedbackCount === "number");
    assert.ok(typeof metrics.priorityAgreementRate === "number");
    assert.ok(typeof metrics.departmentAgreementRate === "number");
    assert.ok(Array.isArray(metrics.insights));
  });
});
