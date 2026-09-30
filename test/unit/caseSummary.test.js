const test = require("node:test");
const assert = require("node:assert");

const { generateCaseSummary } = require("../../engines/caseSummaryEngine");

test("Clinical Case Summary Engine", async (t) => {
  await t.test("generates structured clinical sheet with provided data", () => {
    const caseState = {
      patient: { name: "Rahul Sharma", age: 34, gender: "Male" },
      complaintCategory: "cardiovascular",
      priority: "HIGH",
      suggestedDepartment: "Emergency / Cardiology",
      appointmentDate: "2026-10-01",
      structured: {
        chiefComplaint: { value: "Chest discomfort" },
        onset: { value: "2 hours ago" },
        severity: { value: "8" },
        associatedSymptoms: { value: "Shortness of breath" }
      },
      vitals: {
        bloodPressure: "155/98",
        heartRate: "110",
        spo2: "95"
      },
      riskAssessment: {
        level: "HIGH",
        indicators: ["Acute chest discomfort with high severity"],
        action: "Immediate medical staff notification"
      }
    };

    const summary = generateCaseSummary(caseState);

    assert.ok(summary.includes("CAREPATH AI · CLINICAL PRE-CONSULTATION CASE SUMMARY"));
    assert.ok(summary.includes("Rahul Sharma"));
    assert.ok(summary.includes("Chest discomfort"));
    assert.ok(summary.includes("HIGH"));
    assert.ok(summary.includes("Emergency / Cardiology"));
    assert.ok(summary.includes("155/98"));
    assert.ok(summary.includes("110 BPM"));
    assert.ok(summary.includes("95 %"));
  });

  await t.test("explicitly displays 'Not provided' for missing fields without inventing data", () => {
    const sparseCase = {
      patient: { name: "Priya" },
      structured: {
        chiefComplaint: { value: "Slight headache" }
      }
    };

    const summary = generateCaseSummary(sparseCase);
    assert.ok(summary.includes("Priya"));
    assert.ok(summary.includes("Duration / Onset: Not provided"));
    assert.ok(summary.includes("Severity (1-10): Not provided"));
    assert.ok(summary.includes("Allergies: Not provided"));
    assert.ok(summary.includes("Blood Pressure: Not recorded"));
  });
});
