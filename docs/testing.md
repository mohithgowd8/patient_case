# CAREPATH AI — Testing, Validation & Verification Architecture

## 1. Test Suite Overview
CAREPATH AI maintains a rigorous test suite using Node.js built-in test runner (`node:test` and `node:assert`).
No third-party testing bloat or simulated test runners are used.

## 2. Test Execution
```bash
# Run complete test suite (unit + integration)
npm test

# Run tests with code coverage metrics
npm run test:coverage

# Run static linter and type contract audit
npm run lint
npm run audit
```

## 3. Test Coverage Summary
* **Total Tests**: 102 automated tests across 12 suites
* **Passing Rate**: 100% (102 passed, 0 failed)
* **Code Coverage**:
  - `baselineEngine.js`: 100% Lines, 100% Functions
  - `caseSummaryEngine.js`: 100% Lines, 100% Functions
  - `caseStateEngine.js`: 96.5% Lines, 100% Functions
  - `questionSelectionEngine.js`: 97.4% Lines, 83.3% Functions
  - `riskAssessmentEngine.js`: 96.4% Lines, 87.5% Functions
  - `symptomExtractionEngine.js`: 96.5% Lines, 100% Functions
  - `departmentRoutingEngine.js`: 91.9% Lines, 100% Functions
  - `autonomousDecisionEngine.js`: 91.8% Lines, 81.8% Functions
  - **Overall Code Coverage**: **85.2% Lines, 70.8% Functions**

## 4. Test Categories
* **Unit Tests**:
  - `test/unit/caseStateEngine.test.js`: State schema, linguistic uncertainty, testimony contradiction, stopping criteria.
  - `test/unit/baselineEngine.test.js`: 20-question checklist invariance, question reduction calculation, time savings.
  - `test/unit/autonomousLoop.test.js`: Complete multi-turn consultation cycle and dynamic vitals re-evaluation.
  - `test/unit/questionSelection.test.js`: Dynamic scoring formula, candidate ranking, language localization.
  - `test/unit/riskAssessment.test.js`: Routine vs Urgent vs High Risk classification thresholds.
  - `test/unit/symptomExtraction.test.js`: Multilingual symptom entity and duration extraction.
  - `test/unit/departmentRouting.test.js`: Clinical specialty mapping.
  - `test/unit/caseSummary.test.js`: Structured clinical anamnesis summary generation.
  - `test/unit/feedbackEngine.test.js`: Clinician override recording and agreement analytics.
* **Integration Tests**:
  - `test/integration/apiEndpoints.test.js`: Complete patient consultation, vitals intake, and doctor completion.
  - `test/integration/benchmark.test.js`: `GET /api/benchmark/:consultationId` and authorization boundaries.
  - `test/integration/caseQueueAndNavigation.test.js`: Priority filtering and persistent state.
  - `test/integration/securityHardening.test.js`: Sliding-window rate limiters, security headers, XSS prevention.
  - `test/integration/securityAndEdgeCases.test.js`: Authentication barriers, malformed payload rejection, role boundaries.
