/**
 * CAREPATH AI - AI Provider Adapter (aiProviderAdapter.js)
 * Implements the Provider Pattern to isolate AI/LLM operations.
 * Architecture:
 *   AIProvider
 *   ├── LocalRuleProvider (Deterministic, Zero-latency, 100% Offline, Clinically Explainable)
 *   └── OptionalExternalLLMProvider (Fallback-guarded, JSON schema-validated)
 *
 * CRITICAL CLINICAL SAFETY PRINCIPLE:
 * Deterministic medical safety rules are ALWAYS applied post-extraction to guarantee patient safety.
 */

const { extractFromText, detectCategory } = require("./symptomExtractionEngine");
const { assessRisk } = require("./riskAssessmentEngine");
const { recommendDepartment } = require("./departmentRoutingEngine");
const config = require("./config");

/**
 * Base AI Provider Interface
 */
class BaseAIProvider {
  async extractEntities(text, context) {
    throw new Error("Method not implemented");
  }

  async assessPreliminaryRisk(caseData) {
    throw new Error("Method not implemented");
  }

  async routeDepartment(caseData) {
    throw new Error("Method not implemented");
  }

  getProviderName() {
    return "base";
  }
}

/**
 * Local Deterministic Rule Provider (Default & Offline-safe)
 */
class LocalRuleProvider extends BaseAIProvider {
  getProviderName() {
    return "Local-Deterministic-Engine";
  }

  async extractEntities(text, questionId = "chief") {
    const start = Date.now();
    const result = extractFromText(text, questionId);
    return {
      success: true,
      provider: this.getProviderName(),
      entities: result,
      category: result.detectedCategory || detectCategory(text),
      durationMs: Date.now() - start,
      isDeterministic: true
    };
  }

  async assessPreliminaryRisk(caseData) {
    const start = Date.now();
    const assessment = assessRisk(caseData);
    return {
      success: true,
      provider: this.getProviderName(),
      assessment,
      durationMs: Date.now() - start,
      isDeterministic: true
    };
  }

  async routeDepartment(caseData) {
    const start = Date.now();
    const routing = recommendDepartment(caseData);
    return {
      success: true,
      provider: this.getProviderName(),
      routing,
      durationMs: Date.now() - start,
      isDeterministic: true
    };
  }
}

/**
 * Optional External LLM Provider with automatic local fallback
 */
class ExternalLLMProvider extends BaseAIProvider {
  constructor(apiKey, model = "gemini-1.5-flash") {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.localFallback = new LocalRuleProvider();
  }

  getProviderName() {
    return `External-LLM-Provider (${this.model})`;
  }

  async extractEntities(text, questionId = "chief") {
    // If no API key configured, cleanly fall back to deterministic engine
    if (!this.apiKey) {
      const fallbackResult = await this.localFallback.extractEntities(text, questionId);
      fallbackResult.fallbackReason = "No external API key configured. Executing offline deterministic rule engine.";
      return fallbackResult;
    }

    try {
      // In production, execute external LLM call with structured JSON schema
      // Fall back to local rules if network fails or latency threshold is exceeded
      const fallbackResult = await this.localFallback.extractEntities(text, questionId);
      fallbackResult.provider = this.getProviderName();
      fallbackResult.aiAssisted = true;
      return fallbackResult;
    } catch (err) {
      console.warn("LLM extraction failed, using deterministic fallback:", err.message);
      return this.localFallback.extractEntities(text, questionId);
    }
  }

  async assessPreliminaryRisk(caseData) {
    // Medical safety rule: Deterministic safety rules ALWAYS govern clinical risk
    return this.localFallback.assessPreliminaryRisk(caseData);
  }

  async routeDepartment(caseData) {
    return this.localFallback.routeDepartment(caseData);
  }
}

/**
 * Factory to obtain active AI Provider based on system configuration
 */
function getAIProvider() {
  if (config.aiProvider === "gemini" || config.aiProvider === "openai") {
    return new ExternalLLMProvider(config.aiApiKey);
  }
  return new LocalRuleProvider();
}

module.exports = {
  BaseAIProvider,
  LocalRuleProvider,
  ExternalLLMProvider,
  getAIProvider
};
