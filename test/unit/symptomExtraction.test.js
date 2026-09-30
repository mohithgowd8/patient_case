const test = require("node:test");
const assert = require("node:assert");

const {
  detectCategory,
  extractSeverity,
  extractDuration,
  extractAssociatedSymptoms,
  extractMedicalHistory,
  extractFromText
} = require("../../engines/symptomExtractionEngine");

test("Symptom Extraction Engine - Category Detection", async (t) => {
  await t.test("detects cardiovascular complaint in English", () => {
    assert.strictEqual(detectCategory("Severe chest pain radiating to left arm"), "cardiovascular");
    assert.strictEqual(detectCategory("Heart palpitations and fluttering"), "cardiovascular");
  });

  await t.test("detects cardiovascular complaint in Hindi and Telugu", () => {
    assert.strictEqual(detectCategory("सीने में तेज दर्द हो रहा है"), "cardiovascular");
    assert.strictEqual(detectCategory("ఛాతీలో నొప్పిగా ఉంది"), "cardiovascular");
  });

  await t.test("detects respiratory complaints", () => {
    assert.strictEqual(detectCategory("Difficulty breathing and wheezing"), "respiratory");
    assert.strictEqual(detectCategory("सांस लेने में तकलीफ"), "respiratory");
    assert.strictEqual(detectCategory("తీవ్రమైన దగ్గు"), "respiratory");
  });

  await t.test("detects gastrointestinal complaints", () => {
    assert.strictEqual(detectCategory("Severe stomach ache and nausea"), "gastrointestinal");
    assert.strictEqual(detectCategory("पेट में मरोड़ और उल्टी"), "gastrointestinal");
    assert.strictEqual(detectCategory("కడుపు నొప్పి"), "gastrointestinal");
  });

  await t.test("detects neurological complaints", () => {
    assert.strictEqual(detectCategory("Throbbing headache and dizziness"), "neurological");
    assert.strictEqual(detectCategory("सिर दर्द और चक्कर"), "neurological");
    assert.strictEqual(detectCategory("తీవ్రమైన తలనొప్పి"), "neurological");
  });

  await t.test("falls back to general for unclassified complaints", () => {
    assert.strictEqual(detectCategory("Feeling generally unwell and tired"), "general");
  });
});

test("Symptom Extraction Engine - Numeric and Descriptive Severity", async (t) => {
  await t.test("extracts numeric scale 1-10", () => {
    assert.strictEqual(extractSeverity("Pain is 8 out of 10"), 8);
    assert.strictEqual(extractSeverity("Around 4/10"), 4);
    assert.strictEqual(extractSeverity("About 9"), 9);
  });

  await t.test("extracts descriptive severity in English, Hindi, and Telugu", () => {
    assert.strictEqual(extractSeverity("The pain is severe and unbearable"), 8);
    assert.strictEqual(extractSeverity("दर्द बहुत तीव्र है"), 8);
    assert.strictEqual(extractSeverity("తీవ్రమైన నొప్పి"), 8);
    assert.strictEqual(extractSeverity("Moderate discomfort"), 5);
    assert.strictEqual(extractSeverity("Mild irritation"), 3);
  });

  await t.test("returns null when severity is not specified", () => {
    assert.strictEqual(extractSeverity("Just discomfort since morning"), null);
  });
});

test("Symptom Extraction Engine - Duration and Onset", async (t) => {
  await t.test("extracts English duration entities", () => {
    assert.strictEqual(extractDuration("Started 3 days ago"), "3 days");
    assert.strictEqual(extractDuration("Since 2 hours"), "2 hours");
    assert.strictEqual(extractDuration("Ongoing since yesterday"), "yesterday");
  });

  await t.test("extracts multilingual duration entities", () => {
    assert.ok(extractDuration("दो दिन से"));
    assert.ok(extractDuration("రెండు రోజులు"));
  });
});

test("Symptom Extraction Engine - Associated Warning Signs & History", async (t) => {
  await t.test("extracts shortness of breath, sweating, and dizziness", () => {
    const symptoms = extractAssociatedSymptoms("I have shortness of breath and cold sweat with dizziness");
    assert.ok(symptoms.includes("Shortness of breath"));
    assert.ok(symptoms.includes("Sweating / Diaphoresis"));
    assert.ok(symptoms.includes("Dizziness / Lightheadedness"));
  });

  await t.test("extracts chronic medical history conditions", () => {
    const history = extractMedicalHistory("Patient has hypertension and diabetes mellitus");
    assert.ok(history.includes("Hypertension / High BP"));
    assert.ok(history.includes("Diabetes Mellitus"));
  });

  await t.test("composite entity extraction from narrative", () => {
    const res = extractFromText("Severe chest pain for 3 hours, rating 8/10 with shortness of breath. History of high BP.");
    assert.strictEqual(res.detectedCategory, "cardiovascular");
    assert.strictEqual(res.severity, 8);
    assert.strictEqual(res.duration, "3 hours");
    assert.ok(res.associatedSymptoms.includes("Shortness of breath"));
    assert.ok(res.medicalHistory.includes("Hypertension / High BP"));
  });
});
