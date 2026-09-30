/**
 * CAREPATH AI - Data Access Layer (dataStore.js)
 * Isolates all storage and persistence operations.
 * Allows seamless migration from file-based JSON storage to MongoDB/PostgreSQL in production.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

let memoryDb = null;
const sessions = new Map();
const doctorAccessSessions = new Map();

const now = () => new Date().toISOString();

const generateId = prefix =>
  `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

const randomOtp = () =>
  String(crypto.randomInt(100000, 1000000));

const randomToken = () =>
  crypto.randomBytes(32).toString("hex");

function createInitialDb() {
  const demoDoctorPass = process.env.DEMO_DOCTOR_PASSWORD || "Demo@123";
  const demoAdminPass = process.env.DEMO_ADMIN_PASSWORD || "Admin@123";

  const doctorPassword = bcrypt.hashSync(demoDoctorPass, 10);
  const adminPassword = bcrypt.hashSync(demoAdminPass, 10);

  return {
    users: [
      {
        id: "doc-1",
        role: "DOCTOR",
        name: "Dr. Sharma",
        email: "doctor@patinote.demo",
        password: doctorPassword,
        department: "General Medicine",
        hospitalId: "hospital-1",
        licenseNumber: "MCI-2024-88392",
        licenseFile: "medical_license_dr_sharma.pdf",
        graduationCertificate: "mbbs_degree_dr_sharma.pdf"
      },
      {
        id: "doc-2",
        role: "DOCTOR",
        name: "Dr. Ananya Reddy",
        email: "ananya@patinote.demo",
        password: doctorPassword,
        department: "Cardiology",
        hospitalId: "hospital-1",
        licenseNumber: "MCI-2024-44129",
        licenseFile: "medical_license_dr_reddy.pdf",
        graduationCertificate: "mbbs_degree_dr_reddy.pdf"
      },
      {
        id: "admin-1",
        role: "ADMIN",
        name: "System Administrator",
        email: "admin@patinote.demo",
        password: adminPassword
      }
    ],
    hospitals: [
      {
        id: "hospital-1",
        name: "CarePath Central Hospital",
        city: "Hyderabad",
        departments: [
          "General Medicine",
          "Cardiology",
          "Emergency",
          "Pulmonology",
          "Neurology",
          "Gastroenterology",
          "Pediatrics",
          "Dermatology"
        ]
      }
    ],
    consultations: [],
    alerts: [],
    feedback: [],
    auditLogs: []
  };
}

function initDatabase() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let shouldWrite = false;
  if (!fs.existsSync(DB_PATH)) {
    memoryDb = createInitialDb();
    shouldWrite = true;
  } else {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        throw new Error("Invalid or empty DB format");
      }
      memoryDb = parsed;
      if (!memoryDb.alerts) memoryDb.alerts = [];
      if (!memoryDb.feedback) memoryDb.feedback = [];
      if (!memoryDb.auditLogs) memoryDb.auditLogs = [];
      if (!memoryDb.consultations) memoryDb.consultations = [];
      if (!memoryDb.hospitals) memoryDb.hospitals = [];

      const demoDoctorPass = process.env.DEMO_DOCTOR_PASSWORD || "Demo@123";
      const demoAdminPass = process.env.DEMO_ADMIN_PASSWORD || "Admin@123";

      if (!memoryDb.users.some(u => u.email.toLowerCase() === "doctor@patinote.demo")) {
        memoryDb.users.push({
          id: "doc-demo-patinote",
          role: "DOCTOR",
          name: "Dr. Sharma",
          email: "doctor@patinote.demo",
          password: bcrypt.hashSync(demoDoctorPass, 10),
          department: "General Medicine",
          hospitalId: "hospital-1",
          licenseNumber: "MCI-2024-88392",
          createdAt: now()
        });
        shouldWrite = true;
      }

      if (!memoryDb.users.some(u => u.email.toLowerCase() === "admin@patinote.demo")) {
        memoryDb.users.push({
          id: "admin-demo-patinote",
          role: "ADMIN",
          name: "System Administrator",
          email: "admin@patinote.demo",
          password: bcrypt.hashSync(demoAdminPass, 10),
          createdAt: now()
        });
        shouldWrite = true;
      }
    } catch (err) {
      console.warn("DB file invalid or corrupted, restoring baseline:", err.message);
      memoryDb = createInitialDb();
      shouldWrite = true;
    }
  }

  if (shouldWrite) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(memoryDb, null, 2), "utf8");
    } catch (err) {
      console.error("Non-fatal: failed writing initial db to disk:", err.message);
    }
  }
}

initDatabase();

function getDb() {
  if (!memoryDb) initDatabase();
  return memoryDb;
}

const { scheduleSave, saveImmediate } = require("./persistence");

function saveDb() {
  scheduleSave(memoryDb);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    age: user.age,
    gender: user.gender,
    department: user.department,
    hospitalId: user.hospitalId,
    licenseNumber: user.licenseNumber,
    licenseFile: user.licenseFile,
    graduationCertificate: user.graduationCertificate
  };
}

function audit(action, actor, consultationId = null, metadata = {}) {
  const entry = {
    id: generateId("AUDIT"),
    action,
    actorId: actor?.id || "SYSTEM",
    actorRole: actor?.role || "SYSTEM",
    consultationId: consultationId || null,
    metadata,
    timestamp: now()
  };
  getDb().auditLogs.push(entry);
  saveDb();
  return entry;
}

function generateDisplayId(doctorId, appointmentDate) {
  const doctorConsultations = getDb().consultations.filter(c => c.doctorId === doctorId);
  const serialNo = String(doctorConsultations.length + 1).padStart(3, "0");

  const dateStr = appointmentDate || new Date().toISOString().split("T")[0];
  const parts = dateStr.split("-");
  let dayStr, monthStr, yearStr;

  if (parts.length === 3) {
    yearStr = parts[0];
    monthStr = parts[1].padStart(2, "0");
    dayStr = parts[2].substring(0, 2).padStart(2, "0");
  } else {
    const d = new Date(dateStr);
    dayStr = String(d.getDate()).padStart(2, "0");
    monthStr = String(d.getMonth() + 1).padStart(2, "0");
    yearStr = String(d.getFullYear());
  }

  return `${dayStr}/${monthStr}/${yearStr}/${serialNo}`;
}

module.exports = {
  getDb,
  saveDb,
  saveImmediate,
  publicUser,
  audit,
  generateDisplayId,
  generateId,
  randomOtp,
  randomToken,
  now,
  sessions,
  doctorAccessSessions
};
