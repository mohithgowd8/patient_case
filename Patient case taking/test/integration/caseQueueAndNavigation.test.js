const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../../server");

let server;
let baseUrl;

test.before((t, done) => {
  server = http.createServer(app);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

test.after((t, done) => {
  server.close(done);
});

test("Clinical Case Queue & Navigation Architecture", async (t) => {
  let createdCaseId = null;
  let routineCaseId = null;
  let urgentCaseId = null;
  let highCaseId = null;

  await t.test("Simulate cases across all risk levels", async () => {
    // 1. Simulate Routine
    const resR = await fetch(`${baseUrl}/api/demo/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "routine" })
    });
    assert.strictEqual(resR.status, 200);
    const dataR = await resR.json();
    assert.strictEqual(dataR.consultation.priority, "ROUTINE");
    routineCaseId = dataR.consultation.id;

    // 2. Simulate Urgent
    const resU = await fetch(`${baseUrl}/api/demo/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "urgent" })
    });
    assert.strictEqual(resU.status, 200);
    const dataU = await resU.json();
    assert.strictEqual(dataU.consultation.priority, "URGENT");
    urgentCaseId = dataU.consultation.id;

    // 3. Simulate High Priority
    const resH = await fetch(`${baseUrl}/api/demo/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "high-priority" })
    });
    assert.strictEqual(resH.status, 200);
    const dataH = await resH.json();
    assert.strictEqual(dataH.consultation.priority, "HIGH");
    highCaseId = dataH.consultation.id;
    createdCaseId = highCaseId;
  });

  await t.test("GET /api/cases/overview calculates dynamic counts from database", async () => {
    const res = await fetch(`${baseUrl}/api/cases/overview`);
    assert.strictEqual(res.status, 200);
    const overview = await res.json();

    assert.ok(typeof overview.total === "number");
    assert.ok(typeof overview.routine === "number");
    assert.ok(typeof overview.urgent === "number");
    assert.ok(typeof overview.high === "number");

    assert.ok(overview.total >= 3, "Total cases must include the 3 simulated cases");
    assert.ok(overview.routine >= 1, "Must have at least 1 routine case");
    assert.ok(overview.urgent >= 1, "Must have at least 1 urgent case");
    assert.ok(overview.high >= 1, "Must have at least 1 high-priority case");
    assert.strictEqual(overview.total, overview.routine + overview.urgent + overview.high);
  });

  await t.test("GET /api/cases returns all persisted cases", async () => {
    const res = await fetch(`${baseUrl}/api/cases`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.cases));
    assert.ok(data.count >= 3);

    const found = data.cases.find(c => c.id === highCaseId);
    assert.ok(found, "High priority simulated case must exist in /api/cases");
    assert.strictEqual(found.priority, "HIGH");
    assert.strictEqual(found.riskLevel, "HIGH");
    assert.ok(found.chiefComplaint);
    assert.ok(found.patientName);
  });

  await t.test("GET /api/cases?riskLevel=HIGH filters strictly to HIGH priority", async () => {
    const res = await fetch(`${baseUrl}/api/cases?riskLevel=HIGH`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.cases.length >= 1);
    for (const c of data.cases) {
      assert.strictEqual(c.priority, "HIGH");
      assert.strictEqual(c.riskLevel, "HIGH");
    }
    const found = data.cases.find(c => c.id === highCaseId);
    assert.ok(found, "High case must be included in HIGH filter");
  });

  await t.test("GET /api/cases?riskLevel=URGENT filters strictly to URGENT priority", async () => {
    const res = await fetch(`${baseUrl}/api/cases?riskLevel=URGENT`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.cases.length >= 1);
    for (const c of data.cases) {
      assert.strictEqual(c.priority, "URGENT");
      assert.strictEqual(c.riskLevel, "URGENT");
    }
    const found = data.cases.find(c => c.id === urgentCaseId);
    assert.ok(found, "Urgent case must be included in URGENT filter");
  });

  await t.test("GET /api/cases?riskLevel=ROUTINE filters strictly to ROUTINE priority", async () => {
    const res = await fetch(`${baseUrl}/api/cases?riskLevel=ROUTINE`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.cases.length >= 1);
    for (const c of data.cases) {
      assert.strictEqual(c.priority, "ROUTINE");
      assert.strictEqual(c.riskLevel, "ROUTINE");
    }
    const found = data.cases.find(c => c.id === routineCaseId);
    assert.ok(found, "Routine case must be included in ROUTINE filter");
  });

  await t.test("GET /api/cases/:id returns complete clinical details", async () => {
    const res = await fetch(`${baseUrl}/api/cases/${highCaseId}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const c = data.case;

    assert.strictEqual(c.id, highCaseId);
    assert.strictEqual(c.priority, "HIGH");
    assert.strictEqual(c.riskLevel, "HIGH");
    assert.ok(c.patient.name);
    assert.ok(c.summary);
    assert.ok(Array.isArray(c.responses));
    assert.ok(c.responses.length > 0);
    assert.ok(Array.isArray(c.decisionTrace));
    assert.ok(c.decisionTrace.length > 0);
    assert.ok(c.vitals.bloodPressure);
  });

  await t.test("PATCH /api/cases/:id/override updates priority and department immediately in DB", async () => {
    // Override routine case to URGENT
    const overrideRes = await fetch(`${baseUrl}/api/cases/${routineCaseId}/override`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priority: "URGENT",
        department: "Pulmonology",
        feedbackNotes: "Patient has asthma history, escalating priority."
      })
    });

    assert.strictEqual(overrideRes.status, 200);
    const overrideData = await overrideRes.json();
    assert.strictEqual(overrideData.ok, true);
    assert.strictEqual(overrideData.case.priority, "URGENT");
    assert.strictEqual(overrideData.case.department, "Pulmonology");
    assert.ok(overrideData.feedback);
    assert.strictEqual(overrideData.feedback.doctorPriority, "URGENT");

    // Verify change is persisted in GET /api/cases/:id
    const verifyRes = await fetch(`${baseUrl}/api/cases/${routineCaseId}`);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.case.priority, "URGENT");
    assert.strictEqual(verifyData.case.department, "Pulmonology");
  });

  await t.test("Doctor queue surfaces persisted triage cases", async () => {
    // Login as doctor
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "doctor@patinote.demo",
        password: "Demo@123",
        role: "DOCTOR"
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const { token } = await loginRes.json();

    const queueRes = await fetch(`${baseUrl}/api/doctor/queue`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(queueRes.status, 200);
    const queueData = await queueRes.json();

    assert.ok(queueData.queue.length > 0, "Doctor queue must not be empty when cases exist");
    const highInQueue = queueData.queue.find(q => q.id === highCaseId);
    assert.ok(highInQueue, "High priority case must be visible to attending doctor");
  });
});
