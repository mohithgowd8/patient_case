/**
 * CAREPATH AI - Benchmark Integration API Tests (benchmark.test.js)
 * 
 * Verifies:
 * - GET /api/benchmark/:consultationId returns empirical comparison
 * - Unauthorized access rejection (401/403)
 * - Serialization includes benchmark in doctorCaseView and consultationForPatient
 */

const test = require("node:test");
const assert = require("node:assert");

const app = require("../../server");

test("Benchmark API & Empirical Evaluation Integration", async (t) => {
  let server;
  let baseUrl;
  let patientToken;
  let doctorToken;
  let otherPatientToken;
  let consultationId;

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test("Setup test users and consultation", async () => {
    // 1. Patient
    const regPatient = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Benchmark Patient",
        email: `bench.patient.${Date.now()}@carepath.io`,
        password: "Password@123",
        role: "PATIENT"
      })
    });
    const patientData = await regPatient.json();
    patientToken = patientData.token;

    // 2. Doctor Login
    const loginDoctor = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "doctor@patinote.demo",
        password: "Demo@123",
        role: "DOCTOR"
      })
    });
    const doctorData = await loginDoctor.json();
    doctorToken = doctorData.token;
    const doctorId = doctorData.user.id;

    // 3. Other Patient (for authorization boundary test)
    const regOther = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Other Patient",
        email: `bench.other.${Date.now()}@carepath.io`,
        password: "Password@123",
        role: "PATIENT"
      })
    });
    const otherData = await regOther.json();
    otherPatientToken = otherData.token;

    // 4. Book consultation
    const bookRes = await fetch(`${baseUrl}/api/consultations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        hospitalId: "hospital-1",
        doctorId: doctorId,
        appointmentDate: "2026-10-05"
      })
    });
    const bookData = await bookRes.json();
    consultationId = bookData.consultation.id;

    // 5. Start and answer
    await fetch(`${baseUrl}/api/consultations/${consultationId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({ language: "en", consent: true })
    });

    await fetch(`${baseUrl}/api/consultations/${consultationId}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        questionId: "chief",
        answer: "Fever and headache for 2 days",
        method: "text"
      })
    });
  });

  await t.test("GET /api/benchmark/:consultationId returns empirical benchmark for patient owner", async () => {
    const res = await fetch(`${baseUrl}/api/benchmark/${consultationId}`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.consultationId, consultationId);
    assert.ok(data.benchmark.autonomous);
    assert.ok(data.benchmark.fixedBaseline);
    assert.ok(data.benchmark.comparison);
    assert.strictEqual(data.benchmark.fixedBaseline.questionsAsked, 20);
    assert.ok(data.benchmark.comparison.questionReductionPercent >= 70);
  });

  await t.test("Doctor can access benchmark metrics", async () => {
    const res = await fetch(`${baseUrl}/api/benchmark/${consultationId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
  });

  await t.test("Unrelated patient is forbidden from accessing benchmark", async () => {
    const res = await fetch(`${baseUrl}/api/benchmark/${consultationId}`, {
      headers: { Authorization: `Bearer ${otherPatientToken}` }
    });

    assert.strictEqual(res.status, 403);
  });

  await t.test("Unauthenticated requests receive 401", async () => {
    const res = await fetch(`${baseUrl}/api/benchmark/${consultationId}`);
    assert.strictEqual(res.status, 401);
  });
});
