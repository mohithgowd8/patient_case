const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../../server");
const { getDb } = require("../../engines/dataStore");
const { resetRateLimits } = require("../../engines/rateLimiter");

let server;
let baseUrl;

test.before((t, done) => {
  resetRateLimits();
  server = http.createServer(app);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

test.after((t, done) => {
  resetRateLimits();
  server.close(done);
});

test("Security Hardening, Rate Limiting & Diagnostics", async (t) => {
  await t.test("verifies full suite of security headers (CSP, Permissions-Policy, nosniff, frame-options)", async () => {
    const res = await fetch(`${baseUrl}/api/hospitals`);
    assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.strictEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.ok(res.headers.get("content-security-policy"), "Content-Security-Policy header should be present");
    assert.ok(res.headers.get("content-security-policy").includes("default-src 'self'"));
    assert.ok(res.headers.get("permissions-policy"), "Permissions-Policy header should be present");
    assert.ok(res.headers.get("permissions-policy").includes("microphone=(self)"));
  });

  await t.test("enforces sliding-window rate limiting on auth endpoints with 429 and Retry-After", async () => {
    resetRateLimits();
    const email = `ratelimit.test.${Date.now()}@example.com`;
    let got429 = false;
    let retryAfterHeader = null;

    // Send rapid burst of 25 requests with x-test-rate-limit enabled (auth limit is 20)
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-rate-limit": "true"
        },
        body: JSON.stringify({ email, password: "wrong-password" })
      });

      if (res.status === 429) {
        got429 = true;
        retryAfterHeader = res.headers.get("retry-after");
        const body = await res.json();
        assert.ok(body.error, "Should contain error message");
        assert.strictEqual(body.code, "RATE_LIMIT_EXCEEDED");
        break;
      }
    }

    assert.strictEqual(got429, true, "Rate limiter should trigger 429 after exceeding max attempts");
    assert.ok(retryAfterHeader !== null, "Rate limit response must include Retry-After header");
    resetRateLimits();
  });

  await t.test("enforces sliding-window rate limiting on OTP verification with 429", async () => {
    resetRateLimits();
    let got429 = false;

    // OTP limiter has max 10 requests per minute
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/doctor/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-rate-limit": "true"
        },
        body: JSON.stringify({ consultationId: "CONS-TEST", otp: "000000" })
      });

      if (res.status === 429) {
        got429 = true;
        const body = await res.json();
        assert.strictEqual(body.code, "RATE_LIMIT_EXCEEDED");
        break;
      }
    }

    assert.strictEqual(got429, true, "OTP limiter should trigger 429 after rapid attempts");
    resetRateLimits();
  });

  await t.test("rejects malformed and unparseable JSON payloads with 400", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json payload: true"
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.errorDetail.code, "INVALID_JSON");
  });

  await t.test("resilient to XSS and injection strings in autonomous conversation flow", async () => {
    resetRateLimits();
    // 1. Register patient
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Security Tester <script>alert(1)</script>",
        email: `xss.sec.${Date.now()}@example.com`,
        password: "Password@123",
        role: "PATIENT"
      })
    });
    assert.strictEqual(regRes.status, 201);
    const { token } = await regRes.json();

    // 2. Query valid doctor and hospital
    const db = getDb();
    const doctor = db.users.find(u => u.role === "DOCTOR");
    assert.ok(doctor, "Should find doctor in db");

    // 3. Book consultation
    const bookRes = await fetch(`${baseUrl}/api/consultations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        hospitalId: doctor.hospitalId,
        doctorId: doctor.id,
        department: doctor.department
      })
    });
    assert.strictEqual(bookRes.status, 201);
    const { consultation } = await bookRes.json();

    // 4. Start consultation
    const startRes = await fetch(`${baseUrl}/api/consultations/${consultation.id}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        language: "en",
        consent: true
      })
    });
    assert.strictEqual(startRes.status, 200);
    const startData = await startRes.json();
    const activeQuestion = startData.consultation.nextQuestion;
    assert.ok(activeQuestion, "Consultation must have an active question");

    // 5. Answer question with script and injection tags
    const ansRes = await fetch(`${baseUrl}/api/consultations/${consultation.id}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        questionId: activeQuestion.id,
        answer: "<script>alert('xss')</script> Started yesterday with fever and severe cough '; DROP TABLE consultations; --"
      })
    });
    assert.strictEqual(ansRes.status, 200);
    const ansData = await ansRes.json();
    assert.ok(ansData.consultation, "Autonomous engine should safely process without failure");
    assert.ok(ansData.consultation.responses.length > 0, "Response should be safely appended");
    assert.ok(Array.isArray(ansData.consultation.decisionTrace), "Decision trace should be populated");
  });

  await t.test("exposes latency and autonomous cycle metrics via /api/performance/metrics", async () => {
    const res = await fetch(`${baseUrl}/api/performance/metrics`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.status, "healthy");
    assert.ok(typeof data.uptimeSeconds === "number");
    assert.ok(typeof data.totalRequests === "number");
    assert.ok(data.autonomousTriage, "Metrics should contain autonomous triage diagnostics");
    assert.ok(typeof data.autonomousTriage.totalDecisionCycles === "number");
    assert.ok(typeof data.autonomousTriage.avgLatencyMs === "number");
    assert.ok(data.system, "Metrics should contain system memory stats");
    assert.ok(typeof data.system.memoryUsageMb === "number");
  });

  await t.test("exposes active AI provider and fallback capabilities via /api/ai/provider", async () => {
    const res = await fetch(`${baseUrl}/api/ai/provider`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.ok(data.provider, "Should identify active provider");
    assert.strictEqual(data.isDeterministicSafetyGuaranteed, true);
  });

  await t.test("enforces standardized error contract with error and errorDetail", async () => {
    resetRateLimits();
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Short" }) // missing fields
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, "Top-level error string required for backward compatibility");
    assert.ok(body.errorDetail, "Structured errorDetail required for API contract");
    assert.strictEqual(body.errorDetail.code, "VALIDATION_FAILED");
  });
});
