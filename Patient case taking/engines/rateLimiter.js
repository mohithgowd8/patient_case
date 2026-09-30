/**
 * CAREPATH AI - Sliding Window Rate Limiter Middleware (rateLimiter.js)
 * Protects login, OTP verification, and high-frequency endpoints against brute force and DoS.
 */

const { rateLimits } = require("./config");

const trackers = new Map();

/**
 * Creates a rate limiter middleware instance for a specific route category.
 * @param {string} category - Category name (e.g., 'auth', 'otp', 'simulation', 'global')
 * @param {object} customConfig - Optional overrides { windowMs, max }
 */
function createRateLimiter(category = "global", customConfig = {}) {
  const cfg = {
    ...(rateLimits[category] || rateLimits.global),
    ...customConfig
  };

  const windowMs = cfg.windowMs || 60000;
  const maxRequests = cfg.max || 100;

  return function rateLimiterMiddleware(req, res, next) {
    // In test environment, allow high throughput unless specifically testing rate limiter
    if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
    const key = `${category}:${ip}`;
    const currentTime = Date.now();

    let record = trackers.get(key);
    if (!record) {
      record = { timestamps: [] };
      trackers.set(key, record);
    }

    // Filter out timestamps older than the sliding window
    record.timestamps = record.timestamps.filter(ts => currentTime - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfterSeconds = Math.ceil((windowMs - (currentTime - oldest)) / 1000);

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((oldest + windowMs) / 1000)));

      return res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        error: "Too many requests. Please wait before trying again.",
        errorDetail: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests for ${category}. Maximum ${maxRequests} requests per ${windowMs / 1000}s allowed.`,
          retryAfterSeconds
        }
      });
    }

    record.timestamps.push(currentTime);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(maxRequests - record.timestamps.length));

    next();
  };
}

// Clean up stale trackers every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of trackers.entries()) {
    record.timestamps = record.timestamps.filter(ts => now - ts < 120000);
    if (record.timestamps.length === 0) {
      trackers.delete(key);
    }
  }
}, 300000).unref();

function resetRateLimits() {
  trackers.clear();
}

module.exports = {
  createRateLimiter,
  resetRateLimits
};
