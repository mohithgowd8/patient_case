# CAREPATH AI — Security, Privacy & Secret Hygiene

## 1. Zero Hardcoded Credentials
* All secrets, including `SESSION_SECRET`, API keys, and demo credentials, are loaded via environment variables (`process.env`) managed in `engines/config.js`.
* Production deployments require explicit environment variables; falling back to dev secrets in production is strictly prevented.

## 2. Session Management & Cookie Security
* Authentication sessions are generated using cryptographically strong tokens (`crypto.randomBytes(32)`).
* Session cookies (`sid`) are configured with:
  - `HttpOnly: true`: Prevents client-side JavaScript access and XSS theft.
  - `SameSite: "lax"`: Prevents Cross-Site Request Forgery (CSRF).
  - `Secure: true`: Enforced on production HTTPS environments.

## 3. Rate Limiting & DoS Defense
Sliding-window rate limiters (`engines/rateLimiter.js`) guard against brute-force and resource exhaustion:
* Global API: 600 req/min
* Auth/Login/Register: 20 req/min
* OTP Verification: 10 req/min
* Simulation Execution: 30 req/min

## 4. Hardened Security Headers
CAREPATH AI sets strict HTTP security headers on all responses:
* `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'`
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: SAMEORIGIN`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: camera=(), microphone=(self), geolocation=()`
* `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Production)
