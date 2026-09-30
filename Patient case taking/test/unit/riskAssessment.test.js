const test = require("node:test");
const assert = require("node:assert");

const { assessRisk } = require("../../engines/riskAssessmentEngine");

test("Clinical Risk Assessment Engine", async (t) => {
  await t.test("classifies mild symptoms as ROUTINE", () => {
    const caseState = {
      structured: {
        chiefComplaint: { value: "Mild cold and runny nose" },
        severity: { value: "2" }
      },
      responses: [
        { answer: "Mild cold and runny nose" },
        { answer: "Started yesterday" },
        { answer: "Severity is 2" }
      ],
      vitals: {
        bloodPressure: "120/80",
        heartRate: "72",
        spo2: "99"
      }
    };

    const risk = assessRisk(caseState);
    assert.strictEqual(risk.level, "ROUTINE");
    assert.strictEqual(risk.indicators.length, 0);
    assert.ok(risk.disclaimer.includes("Preliminary AI Risk Assessment"));
  });

  await t.test("classifies moderate/persistent fever as URGENT", () => {
    const caseState = {
      structured: {
        chiefComplaint: { value: "Persistent fever with weakness" },
        severity: { value: "6" }
      },
      responses: [
        { answer: "Persistent fever for 3 days" },
        { answer: "Temperature was 103 F with chills" }
      ],
      vitals: {
        temperature: "103.6",
        heartRate: "108"
      }
    };

    const risk = assessRisk(caseState);
    assert.strictEqual(risk.level, "URGENT");
    assert.ok(risk.indicators.some(i => i.includes("Fever")));
  });

  await t.test("escalates acute chest pain with shortness of breath to HIGH PRIORITY", () => {
    const caseState = {
      structured: {
        chiefComplaint: { value: "Severe crushing chest pain" },
        severity: { value: "9" }
      },
      responses: [
        { answer: "Severe chest discomfort radiating to left arm" },
        { answer: "Shortness of breath and sweating profusely" },
        { answer: "Pain rating is 9 out of 10" }
      ],
      vitals: {
        bloodPressure: "165/105",
        heartRate: "115",
        spo2: "94"
      }
    };

    const risk = assessRisk(caseState);
    assert.strictEqual(risk.level, "HIGH");
    assert.ok(risk.indicators.length > 0);
    assert.ok(risk.action.includes("Immediate medical staff notification"));
  });

  await t.test("escalates critical low oxygen (SpO2 < 92%) to HIGH PRIORITY", () => {
    const caseState = {
      structured: {
        chiefComplaint: { value: "Cough and breathing difficulty" }
      },
      responses: [{ answer: "I can't breathe easily" }],
      vitals: {
        spo2: "89"
      }
    };

    const risk = assessRisk(caseState);
    assert.strictEqual(risk.level, "HIGH");
    assert.ok(risk.indicators.some(i => i.includes("oxygen") || i.includes("Respiratory")));
  });

  await t.test("escalates loss of consciousness to HIGH PRIORITY", () => {
    const caseState = {
      structured: {
        chiefComplaint: { value: "Fainted at work" }
      },
      responses: [{ answer: "I fainted and was unconscious for 2 minutes" }]
    };

    const risk = assessRisk(caseState);
    assert.strictEqual(risk.level, "HIGH");
    assert.ok(risk.indicators.some(i => i.includes("consciousness")));
  });
});
