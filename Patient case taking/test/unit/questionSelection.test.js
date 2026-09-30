const test = require("node:test");
const assert = require("node:assert");

const {
  selectNextQuestion,
  getMissingAttributes
} = require("../../engines/questionSelectionEngine");

test("Autonomous Question Selection Engine", async (t) => {
  await t.test("identifies missing attributes in empty case", () => {
    const caseState = { structured: {} };
    const missing = getMissingAttributes(caseState);
    assert.ok(missing.includes("onset"));
    assert.ok(missing.includes("severity"));
    assert.ok(missing.includes("location"));
  });

  await t.test("prioritizes onset as first follow-up for chest complaint", () => {
    const caseState = {
      complaintCategory: "cardiovascular",
      structured: {
        chiefComplaint: { value: "Chest discomfort" }
      },
      responses: [{ questionId: "chief", answer: "Chest discomfort" }]
    };

    const nextQ = selectNextQuestion(caseState, "en");
    assert.strictEqual(nextQ.id, "onset");
    assert.ok(nextQ.text.includes("start"));
  });

  await t.test("prevents duplicate questions once answered", () => {
    const caseState = {
      complaintCategory: "cardiovascular",
      structured: {
        chiefComplaint: { value: "Chest pain" },
        onset: { value: "2 hours ago" }
      },
      responses: [
        { questionId: "chief", answer: "Chest pain" },
        { questionId: "onset", answer: "2 hours ago" }
      ]
    };

    const nextQ = selectNextQuestion(caseState, "en");
    assert.notStrictEqual(nextQ.id, "onset");
    assert.strictEqual(nextQ.id, "severity");
  });

  await t.test("skips questions if attribute was already opportunistically extracted", () => {
    const caseState = {
      complaintCategory: "cardiovascular",
      structured: {
        chiefComplaint: { value: "Chest pain" },
        onset: { value: "3 hours" },
        severity: { value: "8" } // already extracted
      },
      responses: [
        { questionId: "chief", answer: "Chest pain for 3 hours, rating 8" },
        { questionId: "onset", answer: "3 hours" }
      ]
    };

    const nextQ = selectNextQuestion(caseState, "en");
    // Should skip severity and go to radiation
    assert.strictEqual(nextQ.id, "radiation");
  });

  await t.test("provides translated questions in Hindi and Telugu", () => {
    const caseState = {
      complaintCategory: "general",
      structured: { chiefComplaint: { value: "Fever" } },
      responses: [{ questionId: "chief", answer: "Fever" }]
    };

    const hindiQ = selectNextQuestion(caseState, "hi");
    assert.ok(hindiQ.text.includes("शुरू"));

    const teluguQ = selectNextQuestion(caseState, "te");
    assert.ok(teluguQ.text.includes("ప్రారంభమైంది"));
  });

  await t.test("halts questioning when max questions reached", () => {
    const caseState = {
      complaintCategory: "general",
      structured: {},
      responses: [
        { questionId: "1" },
        { questionId: "2" },
        { questionId: "3" },
        { questionId: "4" },
        { questionId: "5" },
        { questionId: "6" },
        { questionId: "7" }
      ]
    };

    const nextQ = selectNextQuestion(caseState, "en");
    assert.strictEqual(nextQ, null);
  });
});
