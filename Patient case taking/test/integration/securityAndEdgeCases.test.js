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

test("Security Hardening & Edge Cases", async (t) => {
  await t.test("enforces security headers on responses", async () => {
    const res = await fetch(`${baseUrl}/api/hospitals`);
    assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.strictEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  });

  await t.test("rejects unauthenticated requests to protected routes with 401", async () => {
    const res = await fetch(`${baseUrl}/api/me`);
    assert.strictEqual(res.status, 401);
  });

  await t.test("rejects malformed registration payload with 400", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Incomplete" }) // Missing email & password
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test("rejects invalid login credentials with 401", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@user.com", password: "wrong" })
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test("prevents patient from accessing doctor queues with 403", async () => {
    // Register patient
    const pRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Restricted Patient",
        email: `restricted.${Date.now()}@example.com`,
        password: "Pass@123",
        role: "PATIENT"
      })
    });
    const { token } = await pRes.json();

    const qRes = await fetch(`${baseUrl}/api/doctor/queue`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(qRes.status, 403);
  });

  await t.test("prevents unauthorized consultation access between different patients", async () => {
    // Patient A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Patient A",
        email: `pata.${Date.now()}@example.com`,
        password: "Pass@123",
        role: "PATIENT"
      })
    });
    const tokenA = (await resA.json()).token;

    // Patient B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Patient B",
        email: `patb.${Date.now()}@example.com`,
        password: "Pass@123",
        role: "PATIENT"
      })
    });
    const tokenB = (await resB.json()).token;

    // Book as Patient A
    const bookRes = await fetch(`${baseUrl}/api/consultations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        hospitalId: "hospital-1",
        doctorId: "doc-1",
        department: "General Medicine"
      })
    });
    const consultId = (await bookRes.json()).consultation.id;

    // Patient B attempts to access Patient A's consultation
    const accessRes = await fetch(`${baseUrl}/api/consultations/${consultId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(accessRes.status, 403);
  });

  await t.test("rejects non-existent consultation OTP verification with 404", async () => {
    // Login doctor
    const dRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "doctor@patinote.demo",
        password: process.env.DEMO_DOCTOR_PASSWORD || "Demo@123",
        role: "DOCTOR"
      })
    });
    const doctorToken = (await dRes.json()).token;

    // Try invalid OTP
    const verifyRes = await fetch(`${baseUrl}/api/doctor/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        consultationId: "CONS-NONEXISTENT",
        otp: "000000"
      })
    });
    assert.strictEqual(verifyRes.status, 404);
  });
});
