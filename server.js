/**
 * CAREPATH AI - Core Server (server.js)
 * Autonomous Patient Case-Taking & Clinical Decision-Support Assistant
 * Hackathon Track: Intelligent Systems & Autonomous Computing
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");

const {
  getDb,
  saveDb,
  publicUser,
  audit,
  generateDisplayId,
  generateId,
  randomOtp,
  randomToken,
  now,
  sessions,
  doctorAccessSessions
} = require("./engines/dataStore");

const {
  initCaseState,
  processPatientResponse,
  finalizeCase,
  updateVitals,
  ingestReport
} = require("./engines/autonomousDecisionEngine");

const { recordFeedback, analyzeFeedbackPatterns } = require("./engines/feedbackEngine");
const { questionsCatalog } = require("./engines/questionSelectionEngine");
const { assessRisk } = require("./engines/riskAssessmentEngine");
const { generateCaseSummary } = require("./engines/caseSummaryEngine");
const { runFixedQuestionBaseline } = require("./engines/baselineEngine");
const config = require("./engines/config");
const { createRateLimiter } = require("./engines/rateLimiter");
const { performanceMiddleware, getPerformanceSummary } = require("./engines/performanceMonitor");
const { getAIProvider } = require("./engines/aiProviderAdapter");
const {
  ConsultationRepository,
  UserRepository,
  AlertRepository,
  FeedbackRepository,
  AuditRepository
} = require("./engines/persistence");

const app = express();
const PORT = config.port;

// Standardized Error Response Helper
function sendError(res, status, code, message, details = null) {
  return res.status(status).json({
    success: false,
    error: message,
    errorDetail: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

// Performance & Latency Instrumentation Middleware
app.use(performanceMiddleware);

// Security & Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'"
  );
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  if (config.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Cookie parsing
  req.cookies = req.cookies || {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(";").forEach(c => {
      const eqIdx = c.indexOf("=");
      if (eqIdx > 0) {
        const key = c.substring(0, eqIdx).trim();
        const val = c.substring(eqIdx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch {
          req.cookies[key] = val;
        }
      }
    });
  }
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Rate Limiters
const globalLimiter = createRateLimiter("global");
const authLimiter = createRateLimiter("auth");
const otpLimiter = createRateLimiter("otp");
const simulationLimiter = createRateLimiter("simulation");

app.use("/api", globalLimiter);

// Cookie helpers
function setCookie(res, name, value, maxAge) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge
  });
}

function clearCookie(res, name) {
  res.clearCookie(name);
}

// Authentication Middleware
function auth(req, res, next) {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-session-token"] ||
    req.cookies?.sid;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const session = sessions.get(token);

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    clearCookie(res, "sid");
    return res.status(401).json({ error: "Session expired" });
  }

  const db = getDb();
  const user = db.users.find(x => x.id === session.userId);

  if (!user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

// Role Authorization Middleware
function role(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

function findConsultation(idValue) {
  return getDb().consultations.find(c => c.id === idValue);
}

function patientOwns(req, consultation) {
  return req.user.role === "PATIENT" &&
    consultation &&
    consultation.patientId === req.user.id;
}

// Serialization Helpers
function consultationForPatient(c) {
  const db = getDb();
  const doctor = db.users.find(x => x.id === c.doctorId);
  const hospital = db.hospitals.find(x => x.id === c.hospitalId);

  return {
    id: c.id,
    displayId: c.displayId,
    appointmentDate: c.appointmentDate,
    state: c.state,
    lifecycleState: c.lifecycleState || "NEW",
    priority: c.priority || "ROUTINE",
    complaintCategory: c.complaintCategory,
    suggestedDepartment: c.suggestedDepartment || c.department,
    patientName: c.patientName,
    doctorName: doctor?.name,
    department: c.department,
    hospitalName: hospital?.name,
    language: c.language,
    otp: c.state !== "COMPLETED" ? c.otp : null,
    otpExpiresAt: c.otpExpiresAt,
    otpAttempts: c.otpAttempts,
    nextQuestion: c.nextQuestion,
    structured: c.structured || {},
    vitals: c.vitals || {},
    reports: c.reports || [],
    summary: c.summary || "",
    redFlags: c.redFlags || [],
    riskAssessment: c.riskAssessment || null,
    caseState: c.caseState || null,
    benchmark: runFixedQuestionBaseline(c),
    decisionTrace: c.decisionTrace || [],
    missingInformation: c.missingInformation || [],
    responses: c.responses || [],
    prescription: c.prescription,
    doctorNotes: c.state === "COMPLETED" ? c.doctorNotes : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
}

function doctorCaseView(c) {
  const db = getDb();
  const patient = db.users.find(x => x.id === c.patientId);
  const doctor = db.users.find(x => x.id === c.doctorId);

  const summary = c.summary && c.summary.trim() ? c.summary : generateCaseSummary(c);

  return {
    id: c.id,
    displayId: c.displayId,
    appointmentDate: c.appointmentDate,
    state: c.state,
    lifecycleState: c.lifecycleState || "NEW",
    priority: c.priority || "ROUTINE",
    complaintCategory: c.complaintCategory,
    suggestedDepartment: c.suggestedDepartment || c.department,
    patient: {
      id: patient?.id,
      name: patient?.name || c.patientName,
      age: patient?.age || c.structured?.age?.value,
      gender: patient?.gender || c.structured?.gender?.value
    },
    doctor: {
      name: doctor?.name
    },
    department: c.department,
    language: c.language,
    structured: c.structured || {},
    vitals: c.vitals || {},
    reports: c.reports || [],
    summary,
    redFlags: c.redFlags || [],
    riskAssessment: c.riskAssessment || null,
    caseState: c.caseState || null,
    benchmark: runFixedQuestionBaseline(c),
    decisionTrace: c.decisionTrace || [],
    missingInformation: c.missingInformation || [],
    responses: c.responses || [],
    prescription: c.prescription,
    doctorNotes: c.doctorNotes,
    doctorFeedback: c.doctorFeedback || null,
    accessExpiresAt: c.otpExpiresAt
  };
}

function normalizeRiskLevel(level) {
  if (!level) return "ROUTINE";
  const s = String(level).trim().toUpperCase();
  if (s.includes("HIGH") || s.includes("EMERG") || s.includes("CRITICAL") || s.includes("RED")) return "HIGH";
  if (s.includes("URGENT") || s.includes("MODERATE") || s.includes("YELLOW") || s.includes("AMBER")) return "URGENT";
  return "ROUTINE";
}

function caseSummaryItem(c) {
  const db = getDb();
  const doctor = db.users.find(x => x.id === c.doctorId);
  const patient = db.users.find(x => x.id === c.patientId);
  const normPriority = normalizeRiskLevel(c.priority || c.riskAssessment?.priority);
  const chief = c.structured?.chiefComplaint?.value ||
    (c.responses && c.responses.find(r => r.questionId === "chief")?.answer) ||
    c.complaintCategory ||
    "Awaiting clinical intake";

  return {
    id: c.id,
    displayId: c.displayId || c.id,
    patientId: c.patientId,
    patientName: patient?.name || c.patientName || "Anonymous Patient",
    age: patient?.age || c.structured?.age?.value || null,
    gender: patient?.gender || c.structured?.gender?.value || null,
    chiefComplaint: chief,
    priority: normPriority,
    riskLevel: normPriority,
    suggestedDepartment: c.suggestedDepartment || c.department || "General Medicine",
    department: c.department || c.suggestedDepartment || "General Medicine",
    state: c.state || "AWAITING_REVIEW",
    lifecycleState: c.lifecycleState || "NEW",
    indicatorsCount: c.riskAssessment?.indicators?.length || c.redFlags?.length || 0,
    hasVitals: Boolean(c.vitals && Object.keys(c.vitals).length > 0),
    vitals: c.vitals || {},
    redFlags: c.redFlags || [],
    doctorName: doctor?.name || "Attending Physician",
    summary: c.summary || "",
    createdAt: c.createdAt || now(),
    updatedAt: c.updatedAt || c.createdAt || now()
  };
}

function fullCaseDetailView(c) {
  const db = getDb();
  const patient = db.users.find(x => x.id === c.patientId);
  const doctor = db.users.find(x => x.id === c.doctorId);
  const hospital = db.hospitals.find(x => x.id === c.hospitalId);
  const normPriority = normalizeRiskLevel(c.priority || c.riskAssessment?.priority);
  const summary = c.summary && c.summary.trim() ? c.summary : generateCaseSummary(c);

  return {
    id: c.id,
    displayId: c.displayId || c.id,
    appointmentDate: c.appointmentDate,
    state: c.state,
    lifecycleState: c.lifecycleState || "NEW",
    priority: normPriority,
    riskLevel: normPriority,
    complaintCategory: c.complaintCategory,
    suggestedDepartment: c.suggestedDepartment || c.department || "General Medicine",
    department: c.department || c.suggestedDepartment || "General Medicine",
    patient: {
      id: patient?.id || c.patientId,
      name: patient?.name || c.patientName,
      age: patient?.age || c.structured?.age?.value,
      gender: patient?.gender || c.structured?.gender?.value
    },
    doctor: {
      id: doctor?.id,
      name: doctor?.name || "Attending Physician",
      department: doctor?.department || c.department
    },
    hospital: {
      id: hospital?.id,
      name: hospital?.name || "CarePath Central Hospital"
    },
    language: c.language || "en",
    structured: c.structured || {},
    vitals: c.vitals || {},
    reports: c.reports || [],
    responses: c.responses || [],
    redFlags: c.redFlags || [],
    riskAssessment: c.riskAssessment || null,
    caseState: c.caseState || null,
    benchmark: runFixedQuestionBaseline(c),
    decisionTrace: c.decisionTrace || [],
    missingInformation: c.missingInformation || [],
    summary,
    doctorNotes: c.doctorNotes || "",
    doctorFeedback: c.doctorFeedback || null,
    prescription: c.prescription || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  };
}

/* ------------------------------------------------------------------ */
/* Authentication API                                                  */
/* ------------------------------------------------------------------ */

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const {
    name,
    email,
    password,
    age,
    gender,
    role: requestedRoleInput = "PATIENT",
    department,
    hospitalId
  } = req.body;

  if (!name || !email || !password) {
    return sendError(res, 400, "VALIDATION_FAILED", "Name, email, and password are required");
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return sendError(res, 400, "INVALID_EMAIL", "Invalid email format");
  }

  if (String(password).length < 6) {
    return sendError(res, 400, "WEAK_PASSWORD", "Password must be at least 6 characters");
  }

  const db = getDb();
  const existingUser = db.users.find(x => x.email.toLowerCase() === cleanEmail);

  if (existingUser) {
    if (await bcrypt.compare(password, existingUser.password)) {
      const token = randomToken();
      sessions.set(token, {
        userId: existingUser.id,
        expiresAt: Date.now() + 1000 * 60 * 60 * 8
      });

      setCookie(res, "sid", token, 1000 * 60 * 60 * 8);
      audit("LOGIN_VIA_REGISTRATION", existingUser);
      return res.json({ user: publicUser(existingUser), token });
    }

    return res.status(409).json({
      error: "An account with this email already exists. Please sign in or use another email."
    });
  }

  const requestedRole = (requestedRoleInput || "PATIENT").toUpperCase();

  if (requestedRole === "DOCTOR") {
    const doctorAge = Number(age);
    if (isNaN(doctorAge) || doctorAge < 18) {
      return res.status(400).json({
        error: "Doctor registration requires a minimum age of 18 years."
      });
    }
  }

  const user = {
    id: generateId(requestedRole === "DOCTOR" ? "DOC" : "PAT"),
    role: requestedRole === "DOCTOR" ? "DOCTOR" : "PATIENT",
    name: name.trim(),
    email: cleanEmail,
    password: await bcrypt.hash(password, 10),
    age: age ? Number(age) : (requestedRole === "DOCTOR" ? 32 : 25),
    gender: gender || "Prefer not to say",
    department: requestedRole === "DOCTOR" ? (department || "General Medicine") : undefined,
    hospitalId: requestedRole === "DOCTOR" ? (hospitalId || "hospital-1") : undefined,
    licenseNumber: requestedRole === "DOCTOR" ? String(req.body.licenseNumber || "MCI-2024-88392").trim() : undefined,
    createdAt: now()
  };

  db.users.push(user);
  saveDb();

  const token = randomToken();
  sessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8
  });

  setCookie(res, "sid", token, 1000 * 60 * 60 * 8);
  audit(`${user.role}_REGISTERED`, user);

  res.status(201).json({ user: publicUser(user), token });
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password, role: requestedRole } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = getDb();
  let user = db.users.find(x =>
    x.email.toLowerCase() === String(email).toLowerCase() &&
    (!requestedRole || x.role === requestedRole)
  );

  if (!user && requestedRole) {
    user = db.users.find(x =>
      x.email.toLowerCase() === String(email).toLowerCase()
    );
  }

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = randomToken();
  sessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8
  });

  setCookie(res, "sid", token, 1000 * 60 * 60 * 8);
  audit("LOGIN", user);

  res.json({ user: publicUser(user), token });
});

app.post("/api/auth/logout", auth, (req, res) => {
  sessions.delete(req.sessionToken);
  clearCookie(res, "sid");

  if (req.user.role === "DOCTOR") {
    clearCookie(res, "doctor_access");
  }

  audit("LOGOUT", req.user);
  res.json({ ok: true });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ------------------------------------------------------------------ */
/* Hospitals & Doctors Directory                                      */
/* ------------------------------------------------------------------ */

app.get("/api/hospitals", (req, res) => {
  const db = getDb();
  res.json({
    hospitals: db.hospitals.map(h => ({
      id: h.id,
      name: h.name,
      city: h.city,
      departments: h.departments
    }))
  });
});

app.get("/api/doctors", auth, (req, res) => {
  const { hospitalId, department } = req.query;
  const db = getDb();

  const doctors = db.users
    .filter(u =>
      u.role === "DOCTOR" &&
      (!hospitalId || u.hospitalId === hospitalId) &&
      (!department || (u.department && u.department.toLowerCase() === department.toLowerCase()))
    )
    .map(publicUser);

  res.json({ doctors });
});

/* ------------------------------------------------------------------ */
/* Patient Consultation & Case-Taking Workflow                        */
/* ------------------------------------------------------------------ */

app.post("/api/consultations", auth, role("PATIENT"), (req, res) => {
  const { hospitalId, doctorId, department, appointmentDate } = req.body;
  const db = getDb();

  const doctor = db.users.find(x =>
    x.id === doctorId &&
    x.role === "DOCTOR" &&
    x.hospitalId === hospitalId &&
    (!department || (x.department && x.department.toLowerCase() === department.toLowerCase()))
  );

  const hospital = db.hospitals.find(x => x.id === hospitalId);

  if (!doctor || !hospital) {
    return res.status(400).json({ error: "Invalid hospital, doctor, or department" });
  }

  const validAppointmentDate = appointmentDate || new Date().toISOString().split("T")[0];
  const otp = randomOtp();
  const displayId = generateDisplayId(doctorId, validAppointmentDate);

  const consultation = {
    id: generateId("CONS"),
    displayId,
    patientId: req.user.id,
    patientName: req.user.name,
    doctorId,
    hospitalId,
    department,
    suggestedDepartment: department,
    appointmentDate: validAppointmentDate,
    otp,
    otpExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    otpAttempts: 0,
    state: "OTP_GENERATED",
    lifecycleState: "NEW",
    priority: "ROUTINE",
    language: null,
    consentGiven: false,
    nextQuestion: null,
    structured: {
      patientName: { value: req.user.name, source: "Patient registration" },
      age: { value: req.user.age, source: "Patient registration" },
      gender: { value: req.user.gender, source: "Patient registration" }
    },
    vitals: {},
    reports: [],
    responses: [],
    redFlags: [],
    decisionTrace: [],
    missingInformation: [],
    summary: "",
    doctorNotes: "",
    prescription: {
      items: [],
      instructions: "",
      finalized: false,
      finalizedAt: null
    },
    createdAt: now(),
    updatedAt: now()
  };

  initCaseState(consultation, req.user);

  db.consultations.push(consultation);
  saveDb();
  audit("OTP_GENERATED", req.user, consultation.id, {
    doctorId,
    displayId: consultation.displayId
  });

  res.status(201).json({
    consultation: consultationForPatient(consultation)
  });
});

app.get("/api/patient/consultations", auth, role("PATIENT"), (req, res) => {
  const db = getDb();
  const consultations = db.consultations
    .filter(c => c.patientId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(consultationForPatient);

  res.json({ consultations });
});

app.get("/api/consultations/:id", auth, (req, res) => {
  const consultation = findConsultation(req.params.id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  if (req.user.role === "PATIENT" && !patientOwns(req, consultation)) {
    return res.status(403).json({ error: "Unauthorized access to case" });
  }

  res.json({ consultation: consultationForPatient(consultation) });
});

app.post("/api/consultations/:id/start", auth, role("PATIENT"), (req, res) => {
  const consultation = findConsultation(req.params.id);

  if (!patientOwns(req, consultation)) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  if (consultation.state !== "OTP_GENERATED") {
    return res.status(400).json({
      error: `Case taking cannot start from state: ${consultation.state}`
    });
  }

  const { language = "en", consent } = req.body;

  if (!["en", "hi", "te"].includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  if (!consent) {
    return res.status(400).json({ error: "Patient consent is required" });
  }

  consultation.language = language;
  consultation.consentGiven = true;
  consultation.state = "CASE_TAKING";
  consultation.lifecycleState = "INTERVIEWING";

  // Initial chief complaint question
  const qObj = questionsCatalog.chief;
  consultation.nextQuestion = {
    id: qObj.id,
    text: qObj.translations[language] || qObj.translations.en,
    answerType: "text-or-voice"
  };

  consultation.updatedAt = now();
  saveDb();
  audit("CASE_TAKING_STARTED", req.user, consultation.id, { language });

  res.json({ consultation: consultationForPatient(consultation) });
});

app.post("/api/consultations/:id/answer", auth, role("PATIENT"), (req, res) => {
  const consultation = findConsultation(req.params.id);

  if (!patientOwns(req, consultation)) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  if (consultation.state !== "CASE_TAKING") {
    return res.status(400).json({ error: "Case taking is not active" });
  }

  const { questionId, answer, method = "text", language } = req.body;

  if (language && ["en", "hi", "te"].includes(language)) {
    consultation.language = language;
  }

  if (!questionId || !answer || !String(answer).trim()) {
    return res.status(400).json({ error: "A valid answer is required" });
  }

  if (consultation.nextQuestion?.id !== questionId) {
    return res.status(409).json({ error: "This question is no longer active" });
  }

  const responseObj = {
    id: generateId("RESP"),
    questionId,
    question: consultation.nextQuestion.text,
    answer: String(answer).trim(),
    method,
    source: method === "voice" ? "Patient voice response" : "Patient text response",
    timestamp: now()
  };

  consultation.responses.push(responseObj);

  // Trigger Master Autonomous Decision Engine loop
  processPatientResponse(
    consultation,
    questionId,
    responseObj.answer,
    method,
    consultation.language || "en"
  );

  consultation.updatedAt = now();
  saveDb();

  audit("PATIENT_RESPONSE_PROCESSED", req.user, consultation.id, {
    questionId,
    method,
    priority: consultation.priority,
    lifecycleState: consultation.lifecycleState
  });

  res.json({ consultation: consultationForPatient(consultation) });
});

app.post("/api/consultations/:id/vitals", auth, (req, res) => {
  const consultation = findConsultation(req.params.id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  const isPatientOwner = req.user.role === "PATIENT" && patientOwns(req, consultation);
  const isDoctor = req.user.role === "DOCTOR" && consultation.doctorId === req.user.id;

  if (!isPatientOwner && !isDoctor) {
    return res.status(403).json({ error: "Unauthorized to update vitals for this case" });
  }

  const { temperature, bloodPressure, heartRate, spo2, respiratoryRate } = req.body;
  const vitalsData = {};

  if (temperature !== undefined) vitalsData.temperature = String(temperature).trim();
  if (bloodPressure !== undefined) vitalsData.bloodPressure = String(bloodPressure).trim();
  if (heartRate !== undefined) vitalsData.heartRate = String(heartRate).trim();
  if (spo2 !== undefined) vitalsData.spo2 = String(spo2).trim();
  if (respiratoryRate !== undefined) vitalsData.respiratoryRate = String(respiratoryRate).trim();

  updateVitals(consultation, vitalsData);
  saveDb();
  audit("VITALS_UPDATED", req.user, consultation.id, vitalsData);

  res.json({
    ok: true,
    consultation: consultationForPatient(consultation),
    riskAssessment: consultation.riskAssessment
  });
});

app.post("/api/consultations/:id/report", auth, (req, res) => {
  const consultation = findConsultation(req.params.id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  const { fileName, fileType, extractedText } = req.body;

  const report = ingestReport(consultation, {
    fileName: fileName || "Clinical_Diagnostic_Report.pdf",
    fileType: fileType || "application/pdf",
    extractedText: extractedText || "Uploaded diagnostic document verified by clinical triage pipeline."
  });

  saveDb();
  audit("REPORT_ATTACHED", req.user, consultation.id, { reportId: report.id });

  res.json({
    ok: true,
    report,
    consultation: consultationForPatient(consultation)
  });
});

app.patch("/api/consultations/:id/review", auth, role("PATIENT"), (req, res) => {
  const consultation = findConsultation(req.params.id);

  if (!patientOwns(req, consultation)) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  const allowed = [
    "chiefComplaint",
    "onset",
    "location",
    "severity",
    "radiation",
    "breathing",
    "associatedSymptoms",
    "foodRelation",
    "gastrointestinalSymptoms",
    "fever",
    "pastHistory",
    "medications",
    "allergies"
  ];

  const fields = req.body.fields || {};

  for (const field of allowed) {
    if (fields[field] !== undefined) {
      if (!consultation.structured) consultation.structured = {};
      consultation.structured[field] = {
        value: String(fields[field]).trim(),
        source: "Patient manual correction",
        raw: String(fields[field]).trim()
      };
    }
  }

  // Re-assess risk and summary after manual corrections
  consultation.riskAssessment = assessRisk(consultation);
  consultation.priority = consultation.riskAssessment.level;
  consultation.summary = generateCaseSummary(consultation);
  consultation.updatedAt = now();

  saveDb();
  audit("PATIENT_CORRECTED_CASE", req.user, consultation.id);

  res.json({ consultation: consultationForPatient(consultation) });
});

/* ------------------------------------------------------------------ */
/* Public & Clinical Triage Case Queue APIs                           */
/* ------------------------------------------------------------------ */

app.get("/api/cases/overview", (req, res) => {
  const db = getDb();
  const consultations = db.consultations || [];
  const total = consultations.length;
  let routine = 0, urgent = 0, high = 0;
  for (const c of consultations) {
    const p = normalizeRiskLevel(c.priority || c.riskAssessment?.priority);
    if (p === "HIGH") high++;
    else if (p === "URGENT") urgent++;
    else routine++;
  }
  res.json({ total, routine, urgent, high });
});

app.get("/api/cases", (req, res) => {
  const db = getDb();
  let cases = (db.consultations || []).map(caseSummaryItem);

  const { riskLevel, priority, department, state } = req.query;
  const targetRisk = riskLevel || priority;

  if (targetRisk && targetRisk !== "ALL") {
    const normTarget = normalizeRiskLevel(targetRisk);
    cases = cases.filter(c => c.priority === normTarget);
  }

  if (department && department !== "ALL") {
    const deptLower = department.toLowerCase();
    cases = cases.filter(c =>
      (c.suggestedDepartment && c.suggestedDepartment.toLowerCase().includes(deptLower)) ||
      (c.department && c.department.toLowerCase().includes(deptLower))
    );
  }

  if (state && state !== "ALL") {
    cases = cases.filter(c => c.state === state);
  }

  // Priority sorting: HIGH -> URGENT -> ROUTINE, then newest
  const rank = { HIGH: 3, URGENT: 2, ROUTINE: 1 };
  cases.sort((a, b) => {
    const diff = (rank[b.priority] || 1) - (rank[a.priority] || 1);
    if (diff !== 0) return diff;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  res.json({ cases, count: cases.length });
});

app.get("/api/cases/:id", (req, res) => {
  const consultation = findConsultation(req.params.id);
  if (!consultation) {
    return res.status(404).json({ error: "Case not found" });
  }
  res.json({ case: fullCaseDetailView(consultation) });
});

app.patch("/api/cases/:id/override", (req, res) => {
  const consultation = findConsultation(req.params.id);
  if (!consultation) {
    return res.status(404).json({ error: "Case not found" });
  }

  const { priority: newPriority, department: newDept, feedbackNotes } = req.body;
  const originalPriority = consultation.priority || "ROUTINE";
  const originalDepartment = consultation.suggestedDepartment || consultation.department;

  if (newPriority) {
    consultation.priority = normalizeRiskLevel(newPriority);
  }
  if (newDept && String(newDept).trim()) {
    consultation.department = String(newDept).trim();
    consultation.suggestedDepartment = String(newDept).trim();
  }

  const feedback = recordFeedback({
    consultationId: consultation.id,
    doctorId: req.user?.id || "doc-reviewer",
    doctorName: req.user?.name || "Clinical Reviewer",
    aiPriority: originalPriority,
    doctorPriority: consultation.priority,
    aiDepartment: originalDepartment,
    doctorDepartment: consultation.department,
    feedbackNotes
  });

  consultation.doctorFeedback = feedback;
  consultation.updatedAt = now();
  saveDb();

  audit("CLINICAL_CASE_TRIAGE_OVERRIDE", req.user || { id: "reviewer", role: "DOCTOR" }, consultation.id, {
    newPriority: consultation.priority,
    newDepartment: consultation.department
  });

  res.json({ ok: true, case: fullCaseDetailView(consultation), feedback });
});

/* ------------------------------------------------------------------ */
/* System Performance & AI Health APIs                                */
/* ------------------------------------------------------------------ */

app.get("/api/performance/metrics", (req, res) => {
  res.json(getPerformanceSummary());
});

app.get("/api/ai/provider", (req, res) => {
  const provider = getAIProvider();
  res.json({
    provider: provider.getProviderName(),
    configuredProvider: config.aiProvider,
    isDeterministicSafetyGuaranteed: true
  });
});

/* ------------------------------------------------------------------ */
/* Doctor Console & Clinical Triage APIs                              */
/* ------------------------------------------------------------------ */

function invalidateDoctorAccess(consultationId) {
  for (const [token, session] of doctorAccessSessions) {
    if (session.consultationId === consultationId) {
      doctorAccessSessions.delete(token);
    }
  }
}

app.get("/api/doctor/queue", auth, role("DOCTOR"), (req, res) => {
  const db = getDb();
  let doctorConsultations = db.consultations.filter(c => c.doctorId === req.user.id);
  if (!doctorConsultations.length || req.query.all === "true" || req.query.scope === "all") {
    doctorConsultations = db.consultations;
  }

  // Sort: HIGH priority first, then URGENT, then ROUTINE, and then newest
  const priorityRank = { HIGH: 3, URGENT: 2, ROUTINE: 1 };

  const queue = doctorConsultations
    .filter(c =>
      [
        "OTP_GENERATED",
        "CASE_TAKING",
        "WAITING_FOR_DOCTOR",
        "ACTIVE"
      ].includes(c.state)
    )
    .sort((a, b) => {
      const pDiff = (priorityRank[b.priority] || 1) - (priorityRank[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map(c => ({
      id: c.id,
      displayId: c.displayId,
      patientName: c.patientName,
      department: c.department,
      suggestedDepartment: c.suggestedDepartment || c.department,
      priority: c.priority || "ROUTINE",
      indicatorsCount: c.riskAssessment?.indicators?.length || c.redFlags?.length || 0,
      state: c.state,
      lifecycleState: c.lifecycleState,
      createdAt: c.createdAt
    }));

  const completedConsultations = doctorConsultations
    .filter(c => c.state === "COMPLETED")
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .map(c => ({
      id: c.id,
      displayId: c.displayId,
      patientName: c.patientName,
      department: c.department,
      priority: c.priority || "ROUTINE",
      completedAt: c.updatedAt || c.createdAt,
      summary: c.summary,
      prescription: c.prescription
    }));

  const activeAlerts = (db.alerts || []).filter(
    a => !a.acknowledged && queue.some(q => q.id === a.consultationId)
  );

  res.json({
    queue,
    completedCount: completedConsultations.length,
    completedConsultations,
    alerts: activeAlerts
  });
});

app.post("/api/doctor/alerts/:id/ack", auth, role("DOCTOR"), (req, res) => {
  const db = getDb();
  const alert = (db.alerts || []).find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: "Alert not found" });
  }

  alert.acknowledged = true;
  alert.acknowledgedBy = req.user.id;
  alert.acknowledgedAt = now();
  saveDb();
  audit("STAFF_ALERT_ACKNOWLEDGED", req.user, alert.consultationId, { alertId: alert.id });

  res.json({ ok: true, alert });
});

app.post("/api/doctor/verify-otp", otpLimiter, auth, role("DOCTOR"), (req, res) => {
  const { consultationId, otp } = req.body;
  const consultation = findConsultation(consultationId);

  if (!consultation) {
    return res.status(404).json({ error: "Invalid consultation or access denied" });
  }

  // Allow attending doctor to claim/review consultation from triage queue
  if (!consultation.doctorId || consultation.doctorId !== req.user.id) {
    consultation.doctorId = req.user.id;
  }

  if (consultation.state === "COMPLETED") {
    return res.status(410).json({ error: "This consultation has ended. Access has expired." });
  }

  if (new Date(consultation.otpExpiresAt).getTime() < Date.now()) {
    return res.status(410).json({ error: "Consultation OTP has expired." });
  }

  if (consultation.otpAttempts >= 5) {
    return res.status(429).json({ error: "Maximum OTP verification attempts exceeded" });
  }

  consultation.otpAttempts = (consultation.otpAttempts || 0) + 1;

  if (String(otp).trim() !== String(consultation.otp).trim()) {
    saveDb();
    audit("OTP_VERIFICATION_FAILED", req.user, consultation.id);
    return res.status(401).json({ error: "Invalid consultation OTP" });
  }

  consultation.state = "ACTIVE";
  consultation.lifecycleState = "DOCTOR_REVIEW";
  consultation.updatedAt = now();

  const accessToken = randomToken();
  doctorAccessSessions.set(accessToken, {
    doctorId: req.user.id,
    consultationId: consultation.id,
    expiresAt: Math.min(
      Date.now() + 60 * 60 * 1000,
      new Date(consultation.otpExpiresAt).getTime()
    )
  });

  setCookie(res, "doctor_access", accessToken, 60 * 60 * 1000);
  saveDb();
  audit("OTP_VERIFIED_DOCTOR_ACCESS_GRANTED", req.user, consultation.id);

  res.json({
    ok: true,
    consultationId: consultation.id,
    accessExpiresAt: consultation.otpExpiresAt
  });
});

function doctorAccess(req, res, next) {
  const token = req.headers["x-doctor-access"] || req.cookies?.doctor_access;
  const consultationId = req.params.id;
  const consultation = findConsultation(consultationId);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found or access denied" });
  }

  if (!consultation.doctorId || consultation.doctorId !== req.user.id) {
    consultation.doctorId = req.user.id;
  }

  req.consultation = consultation;
  next();
}

app.get("/api/doctor/case/:id", auth, role("DOCTOR"), doctorAccess, (req, res) => {
  res.json({ consultation: doctorCaseView(req.consultation) });
});

// Doctor overrides AI priority or suggested department
app.patch("/api/doctor/case/:id/override", auth, role("DOCTOR"), doctorAccess, (req, res) => {
  const { priority: doctorPriority, department: doctorDepartment, feedbackNotes } = req.body;
  const c = req.consultation;

  const originalPriority = c.priority;
  const originalDepartment = c.suggestedDepartment || c.department;

  if (doctorPriority && ["ROUTINE", "URGENT", "HIGH"].includes(doctorPriority)) {
    c.priority = doctorPriority;
  }

  if (doctorDepartment && String(doctorDepartment).trim()) {
    c.department = String(doctorDepartment).trim();
  }

  const feedbackEntry = recordFeedback({
    consultationId: c.id,
    doctorId: req.user.id,
    doctorName: req.user.name,
    aiPriority: originalPriority,
    doctorPriority: c.priority,
    aiDepartment: originalDepartment,
    doctorDepartment: c.department,
    feedbackNotes
  });

  c.doctorFeedback = feedbackEntry;
  c.updatedAt = now();
  saveDb();

  audit("DOCTOR_OVERRIDE_RECORDED", req.user, c.id, feedbackEntry);

  res.json({
    ok: true,
    message: "Clinical triage decision and feedback recorded.",
    consultation: doctorCaseView(c)
  });
});

app.patch("/api/doctor/case/:id/notes", auth, role("DOCTOR"), doctorAccess, (req, res) => {
  req.consultation.doctorNotes = String(req.body.notes || "").trim();
  req.consultation.updatedAt = now();

  saveDb();
  audit("DOCTOR_NOTES_UPDATED", req.user, req.consultation.id);

  res.json({ consultation: doctorCaseView(req.consultation) });
});

app.put("/api/doctor/case/:id/prescription", auth, role("DOCTOR"), doctorAccess, (req, res) => {
  const { items = [], instructions = "" } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Prescription items must be an array" });
  }

  req.consultation.prescription = {
    items: items
      .filter(x => x.medicine && x.dosage && x.frequency && x.duration)
      .map(x => ({
        medicine: String(x.medicine),
        dosage: String(x.dosage),
        frequency: String(x.frequency),
        duration: String(x.duration),
        instructions: String(x.instructions || "")
      })),
    instructions: String(instructions),
    finalized: false,
    finalizedAt: null
  };

  req.consultation.updatedAt = now();
  saveDb();
  audit("PRESCRIPTION_SAVED", req.user, req.consultation.id);

  res.json({ consultation: doctorCaseView(req.consultation) });
});

function endConsultation(req, res) {
  const consultation = req.consultation || findConsultation(req.params.id);

  if (!consultation) {
    return res.status(404).json({ error: "Consultation not found" });
  }

  if (consultation.state === "COMPLETED") {
    return res.json({
      ok: true,
      message: "Consultation has already ended",
      consultation: consultationForPatient(consultation)
    });
  }

  consultation.state = "COMPLETED";
  consultation.lifecycleState = "REVIEWED";

  if (!consultation.prescription) {
    consultation.prescription = { items: [], instructions: "", finalized: true, finalizedAt: now() };
  } else {
    consultation.prescription.finalized = true;
    consultation.prescription.finalizedAt = now();
  }

  consultation.otp = null;
  consultation.otpExpiresAt = now();
  consultation.updatedAt = now();

  invalidateDoctorAccess(consultation.id);
  saveDb();

  audit("CONSULTATION_ENDED_ACCESS_REVOKED", req.user, consultation.id);
  clearCookie(res, "doctor_access");

  res.json({
    ok: true,
    message: "Consultation completed. Temporary doctor access expired.",
    consultation: consultationForPatient(consultation)
  });
}

app.post("/api/doctor/case/:id/end", auth, role("DOCTOR"), doctorAccess, endConsultation);
app.post("/api/patient/consultations/:id/end", auth, role("PATIENT"), (req, res) => {
  const consultation = findConsultation(req.params.id);
  if (!patientOwns(req, consultation)) {
    return res.status(404).json({ error: "Consultation not found" });
  }
  req.consultation = consultation;
  endConsultation(req, res);
});

/* ------------------------------------------------------------------ */
/* Feedback Analytics & Clinician Learning Layer                      */
/* ------------------------------------------------------------------ */

app.get("/api/feedback/metrics", auth, role("DOCTOR", "ADMIN"), (req, res) => {
  const metrics = analyzeFeedbackPatterns();
  res.json({ metrics });
});

/* ------------------------------------------------------------------ */
/* Demo Simulation Engine ("Try Autonomous Demo")                     */
/* ------------------------------------------------------------------ */

app.post("/api/demo/simulate", simulationLimiter, async (req, res) => {
  const { scenario = "routine" } = req.body;
  const db = getDb();

  // Find demo doctor & hospital
  const doctor = db.users.find(u => u.role === "DOCTOR") || db.users[0];
  const hospital = db.hospitals[0];

  const demoScenarios = {
    routine: {
      patientName: "Aarav Mehta (Demo)",
      age: 26,
      gender: "Male",
      answers: [
        { qId: "chief", text: "Mild cold, runny nose, and slight sore throat." },
        { qId: "onset", text: "Started yesterday morning gradually." },
        { qId: "severity", text: "Mild, about 3 out of 10." },
        { qId: "fever", text: "No fever, only a slight cough." }
      ],
      vitals: { temperature: "98.6", bloodPressure: "120/80", heartRate: "72", spo2: "99" },
      expectedPriority: "ROUTINE",
      expectedDept: "General Medicine"
    },
    urgent: {
      patientName: "Sunita Rao (Demo)",
      age: 44,
      gender: "Female",
      answers: [
        { qId: "chief", text: "Persistent fever with weakness and vomiting." },
        { qId: "onset", text: "Ongoing for 3 days and getting progressively worse." },
        { qId: "severity", text: "Severity is around 6 out of 10." },
        { qId: "fever", text: "Temperature reached 102 degrees F with chills." }
      ],
      vitals: { temperature: "102.2", bloodPressure: "110/70", heartRate: "108", spo2: "96" },
      expectedPriority: "URGENT",
      expectedDept: "General Medicine"
    },
    "high-priority": {
      patientName: "Vikram Malhotra (Demo)",
      age: 58,
      gender: "Male",
      answers: [
        { qId: "chief", text: "Severe crushing chest discomfort radiating to left arm with difficulty breathing." },
        { qId: "onset", text: "Started suddenly 45 minutes ago while climbing stairs." },
        { qId: "severity", text: "Very severe, 9 out of 10." },
        { qId: "breathing", text: "Severe shortness of breath, cold sweating, and feeling dizzy." },
        { qId: "past", text: "Known hypertension and diabetes for 8 years." }
      ],
      vitals: { temperature: "98.4", bloodPressure: "165/102", heartRate: "116", spo2: "93" },
      expectedPriority: "HIGH",
      expectedDept: "Emergency / Cardiology"
    }
  };

  const selectedScenario = demoScenarios[scenario] || demoScenarios.routine;
  const otp = randomOtp();
  const displayId = generateDisplayId(doctor.id, new Date().toISOString().split("T")[0]);

  // Create demo patient user if needed
  let demoPatient = db.users.find(u => u.email === `demo.${scenario}@carepath.demo`);
  if (!demoPatient) {
    demoPatient = {
      id: generateId("PAT-DEMO"),
      role: "PATIENT",
      name: selectedScenario.patientName,
      email: `demo.${scenario}@carepath.demo`,
      password: await bcrypt.hash(config.demoPatientPassword, 10),
      age: selectedScenario.age,
      gender: selectedScenario.gender,
      createdAt: now()
    };
    db.users.push(demoPatient);
  }

  const consultation = {
    id: generateId("CONS-DEMO"),
    displayId,
    patientId: demoPatient.id,
    patientName: demoPatient.name,
    doctorId: doctor.id,
    hospitalId: hospital.id,
    department: selectedScenario.expectedDept,
    suggestedDepartment: selectedScenario.expectedDept,
    appointmentDate: new Date().toISOString().split("T")[0],
    otp,
    otpExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    otpAttempts: 0,
    state: "WAITING_FOR_DOCTOR",
    lifecycleState: "CASE_GENERATED",
    priority: "ROUTINE",
    language: "en",
    consentGiven: true,
    nextQuestion: null,
    structured: {
      patientName: { value: demoPatient.name, source: "Simulated registration" },
      age: { value: demoPatient.age, source: "Simulated registration" },
      gender: { value: demoPatient.gender, source: "Simulated registration" }
    },
    vitals: selectedScenario.vitals,
    reports: [],
    responses: [],
    redFlags: [],
    decisionTrace: [],
    missingInformation: [],
    summary: "",
    doctorNotes: "",
    prescription: { items: [], instructions: "", finalized: false, finalizedAt: null },
    createdAt: now(),
    updatedAt: now()
  };

  initCaseState(consultation, demoPatient);

  // Ingest answers step-by-step through the real autonomous pipeline
  for (const item of selectedScenario.answers) {
    const resp = {
      id: generateId("RESP"),
      questionId: item.qId,
      question: questionsCatalog[item.qId]?.translations.en || item.qId,
      answer: item.text,
      method: "text",
      source: "Patient text response",
      timestamp: now()
    };
    consultation.responses.push(resp);
    processPatientResponse(consultation, item.qId, item.text, "text", "en");
  }

  // Integrate vitals
  updateVitals(consultation, selectedScenario.vitals);

  // Ensure case summary and routing are finalized for doctor view
  finalizeCase(consultation);

  db.consultations.push(consultation);
  saveDb();

  audit("DEMO_SIMULATION_EXECUTED", { id: "DEMO_SYSTEM", role: "SYSTEM" }, consultation.id, {
    scenario,
    priority: consultation.priority,
    suggestedDepartment: consultation.suggestedDepartment
  });

  res.json({
    ok: true,
    scenario,
    consultation: consultationForPatient(consultation),
    otp: consultation.otp,
    demoDoctor: {
      email: doctor.email,
      name: doctor.name
    }
  });
});

/* ------------------------------------------------------------------ */
/* Benchmark & Evaluation API                                         */
/* ------------------------------------------------------------------ */

/**
 * GET /api/benchmark/:consultationId
 * Returns empirical benchmark metrics comparing the autonomous case taking
 * session against traditional fixed-question 20-question baseline intake.
 */
app.get("/api/benchmark/:consultationId", auth, (req, res) => {
  const consultation = findConsultation(req.params.consultationId);
  if (!consultation) {
    return sendError(res, 404, "NOT_FOUND", "Consultation not found");
  }

  // Check authorization (patient owner, doctor, or admin)
  if (req.user.role === "PATIENT" && consultation.patientId !== req.user.id) {
    return sendError(res, 403, "FORBIDDEN", "Unauthorized access to consultation benchmark");
  }

  const benchmark = runFixedQuestionBaseline(consultation);
  res.json({
    ok: true,
    consultationId: consultation.id,
    displayId: consultation.displayId || consultation.id,
    benchmark
  });
});

/* ------------------------------------------------------------------ */
/* Admin Overview                                                     */
/* ------------------------------------------------------------------ */

app.get("/api/admin/overview", auth, role("ADMIN"), (req, res) => {
  const db = getDb();
  res.json({
    counts: {
      users: db.users.length,
      patients: db.users.filter(x => x.role === "PATIENT").length,
      doctors: db.users.filter(x => x.role === "DOCTOR").length,
      consultations: db.consultations.length,
      activeConsultations: db.consultations.filter(x => x.state === "ACTIVE").length,
      highPriorityCases: db.consultations.filter(x => x.priority === "HIGH").length
    },
    hospitals: db.hospitals,
    doctors: db.users.filter(x => x.role === "DOCTOR").map(publicUser),
    auditLogs: (db.auditLogs || []).slice(-50).reverse()
  });
});

/* ------------------------------------------------------------------ */
/* SPA Fallback & Error Handling                                      */
/* ------------------------------------------------------------------ */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Sanitized Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Malformed JSON payload",
      errorDetail: {
        code: "INVALID_JSON",
        message: "The request payload could not be parsed as valid JSON."
      }
    });
  }

  console.error("Unhandled Application Error:", err);
  res.status(500).json({
    error: "A system error occurred. Please try again or contact medical staff.",
    errorDetail: {
      code: "INTERNAL_ERROR",
      message: "An internal server error occurred."
    }
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CAREPATH AI running at http://localhost:${PORT}`);
    console.log("Autonomous Patient Case-Taking & Clinical Triage System");
    console.log("Track: Intelligent Systems & Autonomous Computing");
  });
}

module.exports = app;