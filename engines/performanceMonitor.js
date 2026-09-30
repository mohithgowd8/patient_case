/**
 * CAREPATH AI - Performance & Latency Instrumentation (performanceMonitor.js)
 * Tracks request durations, autonomous decision cycle times, entity extraction latency,
 * and system throughput percentiles without exposing private patient data.
 */

const metrics = {
  totalRequests: 0,
  endpoints: {},
  autonomousCycles: {
    count: 0,
    totalDurationMs: 0,
    minDurationMs: Infinity,
    maxDurationMs: 0,
    recentLatenciesMs: [],
    breakdown: {
      extractionMs: 0,
      riskAnalysisMs: 0,
      questionSelectionMs: 0,
      departmentRoutingMs: 0
    }
  },
  errors: {
    total: 0,
    byStatusCode: {}
  },
  startedAt: new Date().toISOString()
};

/**
 * Record timing for an autonomous computing decision loop
 */
function recordAutonomousCycle(timings) {
  const { totalMs, extractionMs = 0, riskAnalysisMs = 0, questionSelectionMs = 0, departmentRoutingMs = 0 } = timings;

  const ac = metrics.autonomousCycles;
  ac.count++;
  ac.totalDurationMs += totalMs;
  if (totalMs < ac.minDurationMs) ac.minDurationMs = totalMs;
  if (totalMs > ac.maxDurationMs) ac.maxDurationMs = totalMs;

  ac.recentLatenciesMs.push(totalMs);
  if (ac.recentLatenciesMs.length > 100) ac.recentLatenciesMs.shift();

  ac.breakdown.extractionMs += extractionMs;
  ac.breakdown.riskAnalysisMs += riskAnalysisMs;
  ac.breakdown.questionSelectionMs += questionSelectionMs;
  ac.breakdown.departmentRoutingMs += departmentRoutingMs;
}

/**
 * Express middleware to track HTTP request latency
 */
function performanceMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  metrics.totalRequests++;

  const routePath = req.baseUrl || req.path || "other";

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;

    if (!metrics.endpoints[routePath]) {
      metrics.endpoints[routePath] = { count: 0, totalMs: 0, avgMs: 0 };
    }
    const ep = metrics.endpoints[routePath];
    ep.count++;
    ep.totalMs += durationMs;
    ep.avgMs = Math.round((ep.totalMs / ep.count) * 100) / 100;

    const status = res.statusCode;
    if (status >= 400) {
      metrics.errors.total++;
      metrics.errors.byStatusCode[status] = (metrics.errors.byStatusCode[status] || 0) + 1;
    }
  });

  next();
}

/**
 * Returns a sanitized summary of performance metrics (zero PII)
 */
function getPerformanceSummary() {
  const ac = metrics.autonomousCycles;
  const avgCycleMs = ac.count > 0 ? Math.round((ac.totalDurationMs / ac.count) * 100) / 100 : 0;

  // Calculate p95 latency
  let p95Ms = 0;
  if (ac.recentLatenciesMs.length > 0) {
    const sorted = [...ac.recentLatenciesMs].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    p95Ms = Math.round(sorted[idx] * 100) / 100;
  }

  return {
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    totalRequests: metrics.totalRequests,
    autonomousTriage: {
      totalDecisionCycles: ac.count,
      avgLatencyMs: avgCycleMs,
      p95LatencyMs: p95Ms,
      minLatencyMs: ac.minDurationMs === Infinity ? 0 : Math.round(ac.minDurationMs * 100) / 100,
      maxLatencyMs: Math.round(ac.maxDurationMs * 100) / 100,
      averagesByPhaseMs: {
        entityExtraction: ac.count ? Math.round((ac.breakdown.extractionMs / ac.count) * 100) / 100 : 0,
        riskAnalysis: ac.count ? Math.round((ac.breakdown.riskAnalysisMs / ac.count) * 100) / 100 : 0,
        questionSelection: ac.count ? Math.round((ac.breakdown.questionSelectionMs / ac.count) * 100) / 100 : 0,
        departmentRouting: ac.count ? Math.round((ac.breakdown.departmentRoutingMs / ac.count) * 100) / 100 : 0
      }
    },
    system: {
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      nodeVersion: process.version
    },
    errors: metrics.errors
  };
}

module.exports = {
  recordAutonomousCycle,
  performanceMiddleware,
  getPerformanceSummary
};
