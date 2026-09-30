const test = require("node:test");
const assert = require("node:assert");

const { recommendDepartment } = require("../../engines/departmentRoutingEngine");

test("Department Routing Engine", async (t) => {
  await t.test("routes routine chest symptoms to Cardiology", () => {
    const res = recommendDepartment({
      complaintCategory: "cardiovascular",
      priority: "ROUTINE",
      structured: { chiefComplaint: { value: "Mild chest tightness on exertion" } }
    });

    assert.strictEqual(res.department, "Cardiology");
    assert.strictEqual(res.confidence, "HIGH");
    assert.ok(res.disclaimer.includes("Suggested department"));
  });

  await t.test("routes acute high-risk chest symptoms to Emergency / Cardiology", () => {
    const res = recommendDepartment({
      complaintCategory: "cardiovascular",
      priority: "HIGH",
      structured: { chiefComplaint: { value: "Severe crushing chest pain" } }
    });

    assert.strictEqual(res.department, "Emergency / Cardiology");
    assert.strictEqual(res.confidence, "HIGH");
  });

  await t.test("routes digestive symptoms to Gastroenterology", () => {
    const res = recommendDepartment({
      complaintCategory: "gastrointestinal",
      priority: "ROUTINE",
      structured: { chiefComplaint: { value: "Stomach cramping after meals" } }
    });

    assert.strictEqual(res.department, "Gastroenterology");
  });

  await t.test("routes neurological symptoms to Neurology", () => {
    const res = recommendDepartment({
      complaintCategory: "neurological",
      priority: "ROUTINE",
      structured: { chiefComplaint: { value: "Chronic migraines" } }
    });

    assert.strictEqual(res.department, "Neurology");
  });

  await t.test("routes young children (< 14 yrs) to Pediatrics", () => {
    const res = recommendDepartment({
      complaintCategory: "general",
      priority: "ROUTINE",
      patient: { age: 7 },
      structured: { chiefComplaint: { value: "Mild cough and ear ache" } }
    });

    assert.strictEqual(res.department, "Pediatrics");
  });

  await t.test("routes general cold symptoms to General Medicine", () => {
    const res = recommendDepartment({
      complaintCategory: "general",
      priority: "ROUTINE",
      patient: { age: 28 },
      structured: { chiefComplaint: { value: "Runny nose and slight sore throat" } }
    });

    assert.strictEqual(res.department, "General Medicine");
  });
});
