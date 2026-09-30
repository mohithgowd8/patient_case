# CAREPATH AI — Problem Statement & Clinical Objectives

## Track: Intelligent Systems & Autonomous Computing

### 1. Executive Summary
Traditional clinical intake in outpatient departments (OPDs) and emergency rooms relies on rigid, static, paper-based or form-based questionnaires (typically 15 to 25 fixed questions). This fixed approach suffers from two severe failures:
1. **Clinical Inefficiency & Cognitive Fatigue**: A patient presenting with an acute fractured wrist or mild rhinitis is subjected to irrelevant cardiovascular or gastrointestinal checklists, causing delays and frustration.
2. **Delayed Emergency Triage**: In high-risk, acute presentations (e.g., myocardial infarction or respiratory failure), static forms force the patient through routine questions instead of accelerating immediate clinical triage and triggering emergency staff notification.

### 2. The Core Autonomous Computing Problem
CAREPATH AI implements an **autonomous, information-gain-driven patient case-taking and triage system**. Rather than cycling through a predetermined script, CAREPATH AI operates an autonomous computing loop:

$$\text{OBSERVE} \longrightarrow \text{ANALYZE} \longrightarrow \text{UNCERTAINTY \& CONTRADICTION} \longrightarrow \text{ASSESS RISK} \longrightarrow \text{REPLAN} \longrightarrow \text{ACT} \longrightarrow \text{HALT}$$

### 3. Quantitative Objectives & Clinical Hypotheses
* **Question Reduction**: Achieve a **70% to 85% reduction** in question burden compared to standard 20-question fixed intakes by asking only high-yield, entity-directed follow-ups.
* **Triage Latency**: Reduce intake-to-triage time from 15 minutes down to under 3 minutes ($>75\%$ time saved).
* **Early Acute Escalation**: In high-risk clinical presentations, immediately halt questioning within 2 to 3 turns, dispatch an emergency staff alert, and handover to attending clinicians.
* **Deterministic Information Completeness**: Track canonical clinical state across 6 dimensions (`chief_complaint`, `onset_and_duration`, `severity_score`, `character_and_location`, `associated_warning_signs`, `medical_history`).

### 4. Medically Responsible Human-in-the-Loop AI
CAREPATH AI is explicitly designed as a **decision-support and intake assistant**, NOT an autonomous diagnostician:
* **No Diagnostic Invention**: The system identifies preliminary warning indicators and triage priority; it does not fabricate formal medical diagnoses.
* **Doctor Retains Final Authority**: Every case is placed in the Doctor Review Queue with complete auditable decision traces and one-click clinical override capability.
* **Clinician Feedback Learning**: Clinician overrides are tracked to continually improve department routing and risk calibration.
