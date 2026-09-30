/**
 * CAREPATH AI - Asynchronous Persistence Layer & Repositories (persistence.js)
 * Implements non-blocking, atomic file writes with a debounced mutex queue.
 * Provides Repository Pattern interfaces to decouple domain logic from JSON storage,
 * enabling seamless migration to PostgreSQL / MongoDB.
 */

const fs = require("node:fs");
const path = require("node:path");

const os = require("node:os");

const isVercel = Boolean(process.env.VERCEL);
const DB_PATH = isVercel
  ? path.join(os.tmpdir(), "carepath_db.json")
  : path.join(__dirname, "..", "data", "db.json");
const TMP_PATH = `${DB_PATH}.tmp`;

let memoryDb = null;
let writeInProgress = false;
let writeQueued = false;
let debounceTimer = null;

/**
 * Initializes database in memory
 */
function initDb(initialData = null) {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      memoryDb = JSON.parse(raw);
    } catch {
      memoryDb = initialData || { users: [], hospitals: [], consultations: [], alerts: [], feedback: [], auditLogs: [] };
    }
  } else {
    memoryDb = initialData || { users: [], hospitals: [], consultations: [], alerts: [], feedback: [], auditLogs: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(memoryDb, null, 2), "utf8");
  }

  if (!memoryDb.users) memoryDb.users = [];
  if (!memoryDb.hospitals) memoryDb.hospitals = [];
  if (!memoryDb.consultations) memoryDb.consultations = [];
  if (!memoryDb.alerts) memoryDb.alerts = [];
  if (!memoryDb.feedback) memoryDb.feedback = [];
  if (!memoryDb.auditLogs) memoryDb.auditLogs = [];

  return memoryDb;
}

function setDatabase(db) {
  if (db && typeof db === "object" && Array.isArray(db.users)) {
    memoryDb = db;
  }
}

function getDatabase() {
  if (!memoryDb) initDb();
  return memoryDb;
}

/**
 * Atomically writes data to disk using temporary file + rename to prevent corruption.
 */
async function atomicWriteToDisk() {
  if (writeInProgress) {
    writeQueued = true;
    return;
  }

  const dbToSave = memoryDb || getDatabase();
  if (!dbToSave || !Array.isArray(dbToSave.users) || dbToSave.users.length === 0) {
    return;
  }

  writeInProgress = true;
  writeQueued = false;

  const tmpPath = `${DB_PATH}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;

  try {
    const data = JSON.stringify(dbToSave, null, 2);
    await fs.promises.writeFile(tmpPath, data, "utf8");
    try {
      await fs.promises.rename(tmpPath, DB_PATH);
    } catch {
      // Windows file lock fallback: copy and unlink
      await fs.promises.copyFile(tmpPath, DB_PATH);
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  } catch (err) {
    // If temp file was left behind, attempt cleanup
    await fs.promises.unlink(tmpPath).catch(() => {});
  } finally {
    writeInProgress = false;
    if (writeQueued) {
      writeQueued = false;
      setImmediate(atomicWriteToDisk);
    }
  }
}

/**
 * Debounced save scheduler: batches rapid writes into a single disk I/O operation.
 */
function scheduleSave(db = null, delayMs = 25) {
  if (db) setDatabase(db);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    atomicWriteToDisk();
  }, delayMs);
}

/**
 * Immediate synchronous fallback (only used in shutdown or tests if needed)
 */
function saveImmediate(db = null) {
  if (db) setDatabase(db);
  const dbToSave = memoryDb || getDatabase();
  if (!dbToSave || !Array.isArray(dbToSave.users)) return;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbToSave, null, 2), "utf8");
  } catch (err) {
    console.error("Failed writing DB synchronously:", err);
  }
}

/* ------------------------------------------------------------------ */
/* Repository Pattern Abstractions                                    */
/* ------------------------------------------------------------------ */

const ConsultationRepository = {
  findById(id) {
    return getDatabase().consultations.find(c => c.id === id);
  },

  findAll(filterFn = null) {
    const list = getDatabase().consultations;
    return filterFn ? list.filter(filterFn) : list;
  },

  findByPatient(patientId) {
    return getDatabase().consultations.filter(c => c.patientId === patientId);
  },

  findByDoctor(doctorId) {
    return getDatabase().consultations.filter(c => c.doctorId === doctorId);
  },

  create(consultation) {
    getDatabase().consultations.push(consultation);
    scheduleSave();
    return consultation;
  },

  update(id, updaterFn) {
    const consultation = this.findById(id);
    if (!consultation) return null;
    updaterFn(consultation);
    consultation.updatedAt = new Date().toISOString();
    scheduleSave();
    return consultation;
  },

  getPriorityCounts() {
    const consultations = getDatabase().consultations;
    let routine = 0, urgent = 0, high = 0;
    for (const c of consultations) {
      const p = String(c.priority || "").toUpperCase();
      if (p.includes("HIGH")) high++;
      else if (p.includes("URGENT")) urgent++;
      else routine++;
    }
    return { total: consultations.length, routine, urgent, high };
  }
};

const UserRepository = {
  findById(id) {
    return getDatabase().users.find(u => u.id === id);
  },

  findByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    return getDatabase().users.find(u => u.email && u.email.toLowerCase() === clean);
  },

  create(user) {
    getDatabase().users.push(user);
    scheduleSave();
    return user;
  },

  listDoctors(hospitalId = null) {
    return getDatabase().users.filter(u =>
      u.role === "DOCTOR" && (!hospitalId || u.hospitalId === hospitalId)
    );
  }
};

const AlertRepository = {
  create(alert) {
    if (!getDatabase().alerts) getDatabase().alerts = [];
    getDatabase().alerts.push(alert);
    scheduleSave();
    return alert;
  },

  findActive() {
    return (getDatabase().alerts || []).filter(a => !a.acknowledged);
  },

  acknowledge(alertId, doctorId) {
    const alert = (getDatabase().alerts || []).find(a => a.id === alertId);
    if (!alert) return null;
    alert.acknowledged = true;
    alert.acknowledgedBy = doctorId;
    alert.acknowledgedAt = new Date().toISOString();
    scheduleSave();
    return alert;
  }
};

const FeedbackRepository = {
  record(entry) {
    if (!getDatabase().feedback) getDatabase().feedback = [];
    getDatabase().feedback.push(entry);
    scheduleSave();
    return entry;
  },

  getAll() {
    return getDatabase().feedback || [];
  }
};

const AuditRepository = {
  record(entry) {
    if (!getDatabase().auditLogs) getDatabase().auditLogs = [];
    getDatabase().auditLogs.push(entry);
    scheduleSave();
    return entry;
  },

  getRecent(limit = 50) {
    return (getDatabase().auditLogs || []).slice(-limit).reverse();
  }
};

module.exports = {
  initDb,
  getDatabase,
  scheduleSave,
  saveImmediate,
  ConsultationRepository,
  UserRepository,
  AlertRepository,
  FeedbackRepository,
  AuditRepository
};
