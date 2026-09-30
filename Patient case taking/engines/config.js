/**
 * CAREPATH AI - Central Configuration Module (config.js)
 * Manages environment variables, secrets, rate limits, and deployment flags.
 * Production security best practice: No hardcoded secrets.
 */

require("node:path");

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

module.exports = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT, 10) || 4000,

  // Session Security
  sessionSecret: process.env.SESSION_SECRET || (isProduction ? null : "carepath-ai-dev-secret-key-eval-2026"),
  sessionTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  cookieSecure: process.env.COOKIE_SECURE === "true" || isProduction,
  cookieSameSite: "lax",

  // Demo Credentials (Configurable via environment variables)
  demoDoctorPassword: process.env.DEMO_DOCTOR_PASSWORD || "Demo@123",
  demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD || "Admin@123",
  demoPatientPassword: process.env.DEMO_PATIENT_PASSWORD || "DemoPatient@123",

  // Rate Limiting Config
  rateLimits: {
    global: {
      windowMs: 60 * 1000, // 1 minute
      max: 600
    },
    auth: {
      windowMs: 60 * 1000,
      max: 20
    },
    otp: {
      windowMs: 60 * 1000,
      max: 10
    },
    simulation: {
      windowMs: 60 * 1000,
      max: 30
    }
  },

  // AI Adapter Config
  aiProvider: process.env.AI_PROVIDER || "local", // "local" | "gemini" | "openai"
  aiApiKey: process.env.AI_API_KEY || null,

  // Autonomous Engine Parameters
  autonomous: {
    maxQuestions: 6,
    requireDoctorReviewForUrgent: true,
    requireStaffAlertForHigh: true
  }
};
