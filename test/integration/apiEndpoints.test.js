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

test("API Integration - Full Consultation & Clinical Triage Flow", async (t) => {
  let patientToken = null;
  let doctorToken = null;
  let doctorId = null;
  let consultationId = null;
  let consultationOtp = null;

  await t.test("Register new patient", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Patient",
        email: `test.pat.${Date.now()}@example.com`,
        password: "SecurePassword@123",
        age: 30,
        gender: "Female",
        role: "PATIENT"
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, "PATIENT");
    assert.strictEqual(data.user.password, undefined, "Password must not be returned");
    patientToken = data.token;
  });

  await t.test("Login existing doctor", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "doctor@patinote.demo",
        password: process.env.DEMO_DOCTOR_PASSWORD || "Demo@123",
        role: "DOCTOR"
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, "DOCTOR");
    doctorToken = data.token;
    doctorId = data.user.id;
  });

  await t.test("Fetch hospitals and doctors directory", async () => {
    const hRes = await fetch(`${baseUrl}/api/hospitals`);
    assert.strictEqual(hRes.status, 200);
    const hData = await hRes.json();
    assert.ok(hData.hospitals.length > 0);

    const dRes = await fetch(`${baseUrl}/api/doctors`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    assert.strictEqual(dRes.status, 200);
    const dData = await dRes.json();
    assert.ok(dData.doctors.length > 0);
  });

  await t.test("Book consultation as patient", async () => {
    const res = await fetch(`${baseUrl}/api/consultations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        hospitalId: "hospital-1",
        doctorId: doctorId || "doc-1",
        department: "General Medicine",
        appointmentDate: "2026-10-01"
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.consultation.id);
    assert.ok(data.consultation.otp);
    consultationId = data.consultation.id;
    consultationOtp = data.consultation.otp;
  });

  await t.test("Start autonomous consultation with consent", async () => {
    const res = await fetch(`${baseUrl}/api/consultations/${consultationId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        language: "en",
        consent: true
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.consultation.state, "CASE_TAKING");
    assert.strictEqual(data.consultation.nextQuestion.id, "chief");
  });

  await t.test("Submit chief complaint through autonomous loop", async () => {
    const res = await fetch(`${baseUrl}/api/consultations/${consultationId}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        questionId: "chief",
        answer: "Severe chest pain radiating to left arm",
        method: "text"
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.consultation.structured.chiefComplaint.value, "Severe chest pain radiating to left arm");
    assert.strictEqual(data.consultation.complaintCategory, "cardiovascular");
    assert.ok(data.consultation.decisionTrace.length > 0);
  });

  await t.test("Submit vitals signs", async () => {
    const res = await fetch(`${baseUrl}/api/consultations/${consultationId}/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        bloodPressure: "160/100",
        heartRate: "112",
        spo2: "93",
        temperature: "98.6"
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.consultation.vitals.bloodPressure, "160/100");
    assert.strictEqual(data.consultation.priority, "HIGH");
  });

  await t.test("Doctor queue receives high priority patient with staff alert", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/queue`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const caseInQueue = data.queue.find(q => q.id === consultationId);
    assert.ok(caseInQueue, "Case must appear in doctor queue");
    assert.strictEqual(caseInQueue.priority, "HIGH");
  });

  await t.test("Doctor verifies OTP and gets authorized access", async () => {
    const res = await fetch(`${baseUrl}/api/doctor/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        consultationId,
        otp: consultationOtp
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.ok, true);
  });

  await t.test("Doctor views case detail and executes triage override", async () => {
    // Read case
    const res = await fetch(`${baseUrl}/api/doctor/case/${consultationId}`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        Cookie: `doctor_access=${consultationId}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.consultation.decisionTrace.length > 0);
    assert.ok(data.consultation.summary);

    // Save clinician override
    const overrideRes = await fetch(`${baseUrl}/api/doctor/case/${consultationId}/override`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        priority: "HIGH",
        department: "Emergency / Cardiology",
        feedbackNotes: "Confirmed acute coronary triage pathway."
      })
    });

    assert.strictEqual(overrideRes.status, 200);
    const overrideData = await overrideRes.json();
    assert.ok(overrideData.consultation.doctorFeedback);
  });

  await t.test("Doctor saves prescription and completes visit", async () => {
    const prescRes = await fetch(`${baseUrl}/api/doctor/case/${consultationId}/prescription`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        items: [
          { medicine: "Aspirin", dosage: "300mg", frequency: "Stat", duration: "1 dose", instructions: "Chew immediately" }
        ],
        instructions: "Immediate cardiac monitoring and ECG in ER."
      })
    });

    assert.strictEqual(prescRes.status, 200);

    const endRes = await fetch(`${baseUrl}/api/doctor/case/${consultationId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${doctorToken}` }
    });

    assert.strictEqual(endRes.status, 200);
    const endData = await endRes.json();
    assert.strictEqual(endData.consultation.state, "COMPLETED");
  });

  await t.test("Demo simulation executes correctly for all scenarios", async () => {
    for (const scenario of ["routine", "urgent", "high-priority"]) {
      const res = await fetch(`${baseUrl}/api/demo/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.consultation.id);
      assert.ok(data.otp);
      assert.ok(data.consultation.summary);
      assert.ok(data.consultation.decisionTrace.length > 0);
    }
  });
});
