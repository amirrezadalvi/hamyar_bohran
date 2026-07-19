import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { hashPassword, isPasswordHash } from './password';
import { normalizeCity } from './cities';

function findProjectRoot(startPath: string): string {
  let current = path.resolve(startPath);
  let projectMatch: string | null = null;
  while (true) {
    const packageFile = path.join(current, 'package.json');
    if (fs.existsSync(packageFile)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
        if (packageJson.name === 'hamyar-bohran') projectMatch = current;
      } catch {}
    }
    const parent = path.dirname(current);
    if (parent === current) return projectMatch || path.resolve(startPath);
    current = parent;
  }
}

const projectRoot = findProjectRoot(process.cwd());
const explicitDbPath = process.env.SQLITE_DB_PATH?.trim();
const persistentDiskPath = process.env.PERSISTENT_DISK_PATH?.trim() || '/data';
const isHostedRuntime = Boolean(
  process.env.KUBERNETES_SERVICE_HOST ||
  process.env.HAMRAVESH_APP_ID ||
  process.env.HAMRAVESH_SERVICE_NAME ||
  process.env.PERSISTENT_DISK_PATH ||
  (process.platform !== 'win32' && projectRoot === '/app' && fs.existsSync('/data'))
);

// اجرای محلی dev/start/standalone همگی از data پروژه استفاده می‌کنند؛ محیط میزبانی از دیسک /data.
const dbPath = explicitDbPath
  ? (path.isAbsolute(explicitDbPath) ? explicitDbPath : path.resolve(projectRoot, explicitDbPath))
  : path.join(isHostedRuntime ? persistentDiskPath : path.join(projectRoot, 'data'), 'database.sqlite');
const dbFolder = path.dirname(dbPath);

// ایجاد پوشه دیتابیس در صورت عدم وجود
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

// --- شروع بخش اصلاح شده برای پایداری در لوکال ---
let db: Database.Database;

const databaseGlobal = globalThis as typeof globalThis & { _db?: Database.Database; _dbPath?: string };
if (!databaseGlobal._db || databaseGlobal._dbPath !== dbPath) {
  databaseGlobal._db = new Database(dbPath);
  databaseGlobal._dbPath = dbPath;
}
db = databaseGlobal._db;
// --- پایان بخش اصلاح شده ---

// تنظیم حالت WAL برای افزایش کارایی و جلوگیری از کراش ناخواسته در SQLite
db.pragma('busy_timeout = 5000');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ایجاد جدول‌ها در صورت نیاز
db.exec(`
  CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT,
    phone TEXT,
    nationalId TEXT,
    skills TEXT,
    job TEXT,
    address TEXT,
    status TEXT,
    fixedPassword TEXT,
    rank TEXT,
    gender TEXT,
    birthDate TEXT,
    city TEXT
  );
  
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    totalVisVisits INTEGER DEFAULT 0,
    uniqueUsers INTEGER DEFAULT 0,
    mobileHits INTEGER DEFAULT 0,
    desktopHits INTEGER DEFAULT 0,
    lastActiveTime TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY,
    type TEXT,
    severityValue INTEGER,
    description TEXT,
    reporterName TEXT,
    reporterPhone TEXT,
    lat REAL,
    lng REAL,
    status TEXT,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    assignedHamyars TEXT DEFAULT '[]',
    manualAddress TEXT,
    mapLat REAL,
    mapLng REAL,
    city TEXT
  );

  CREATE TABLE IF NOT EXISTS incident_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidentId INTEGER NOT NULL,
    volunteerId INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incidentId) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (volunteerId) REFERENCES volunteers(id) ON DELETE CASCADE,
    UNIQUE (incidentId, volunteerId)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS one_active_incident_per_volunteer
  ON incident_assignments(volunteerId)
  WHERE active = 1;

  CREATE INDEX IF NOT EXISTS incident_assignments_incident_idx
  ON incident_assignments(incidentId);

  CREATE TABLE IF NOT EXISTS incident_sms_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidentId INTEGER NOT NULL,
    recipientKey TEXT NOT NULL,
    notificationType TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incidentId) REFERENCES incidents(id) ON DELETE CASCADE,
    UNIQUE (incidentId, recipientKey, notificationType)
  );

  CREATE TABLE IF NOT EXISTS volunteer_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteerId INTEGER,
    applicantPhone TEXT NOT NULL,
    objectKey TEXT NOT NULL UNIQUE,
    originalName TEXT NOT NULL,
    contentType TEXT NOT NULL,
    size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploadedAt TEXT,
    FOREIGN KEY (volunteerId) REFERENCES volunteers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS volunteer_documents_volunteer_idx
  ON volunteer_documents(volunteerId);

  CREATE INDEX IF NOT EXISTS volunteer_documents_applicant_idx
  ON volunteer_documents(applicantPhone, status);

  CREATE TABLE IF NOT EXISTS volunteer_upload_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicantPhone TEXT NOT NULL,
    objectKey TEXT NOT NULL UNIQUE,
    originalName TEXT NOT NULL,
    contentType TEXT NOT NULL,
    size INTEGER NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS volunteer_upload_sessions_applicant_idx
  ON volunteer_upload_sessions(applicantPhone, createdAt);
  `);

// ===== اضافه کردن ستون‌های جدید به صورت ایمن (برای داده‌های قدیمی) =====
try {
  db.exec(`ALTER TABLE volunteers ADD COLUMN gender TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE volunteers ADD COLUMN birthDate TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE volunteers ADD COLUMN city TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE volunteers ADD COLUMN approvalSmsStatus TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE volunteers ADD COLUMN approvalSmsSentAt TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE incidents ADD COLUMN manualAddress TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE incidents ADD COLUMN mapLat REAL;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE incidents ADD COLUMN mapLng REAL;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE incidents ADD COLUMN city TEXT;`);
} catch (e) {}

// یکسان‌سازی غیرمخرب نام شهرهای شناخته‌شده؛ مقادیر ناشناخته قدیمی حفظ می‌شوند.
const normalizeStoredCities = (table: 'volunteers' | 'incidents') => {
  const rows = db.prepare(`SELECT id, city FROM ${table} WHERE city IS NOT NULL AND city != ''`).all() as { id: number; city: string }[];
  const update = db.prepare(`UPDATE ${table} SET city = ? WHERE id = ?`);
  db.transaction(() => {
    for (const row of rows) {
      const normalized = normalizeCity(row.city);
      if (normalized && normalized !== row.city) update.run(normalized, row.id);
    }
  })();
};
normalizeStoredCities('volunteers');
normalizeStoredCities('incidents');

// انتقال یک‌باره و غیرمخرب اعزام‌های قدیمی از فیلد JSON به رابطه جدید.
const legacyIncidents = db.prepare(`
  SELECT id, status, assignedHamyars FROM incidents
  WHERE assignedHamyars IS NOT NULL AND assignedHamyars NOT IN ('', '[]')
`).all() as { id: number; status: string; assignedHamyars: string }[];
const findVolunteerByName = db.prepare('SELECT id FROM volunteers WHERE fullName = ? LIMIT 1');
const migrateAssignment = db.prepare(`
  INSERT OR IGNORE INTO incident_assignments (incidentId, volunteerId, active)
  VALUES (?, ?, ?)
`);

db.transaction(() => {
  for (const incident of legacyIncidents) {
    try {
      const names = JSON.parse(incident.assignedHamyars);
      if (!Array.isArray(names)) continue;
      const active = incident.status === 'تایید شده' || incident.status === 'تحت کنترل همیار (اعزام نیرو)';
      for (const name of names) {
        const volunteer = findVolunteerByName.get(String(name)) as { id: number } | undefined;
        if (volunteer) migrateAssignment.run(incident.id, volunteer.id, active ? 1 : 0);
      }
    } catch {
      // داده قدیمی نامعتبر نادیده گرفته می‌شود و فیلد اصلی برای بازیابی باقی می‌ماند.
    }
  }
})();

// تبدیل غیرمخرب گذرواژه‌های قدیمی به هش امن؛ مقدار اصلی هرگز پس از این مرحله نگهداری نمی‌شود.
const legacyPasswords = db.prepare(`
  SELECT id, fixedPassword FROM volunteers
  WHERE fixedPassword IS NOT NULL AND fixedPassword != ''
`).all() as { id: number; fixedPassword: string }[];
const updatePasswordHash = db.prepare('UPDATE volunteers SET fixedPassword = ? WHERE id = ?');
db.transaction(() => {
  for (const volunteer of legacyPasswords) {
    if (!isPasswordHash(volunteer.fixedPassword)) {
      updatePasswordHash.run(hashPassword(volunteer.fixedPassword), volunteer.id);
    }
  }
})();

// اگر جدول analytics خالی بود، یک رکورد پیش‌فرض اضافه کن
const checkAnalytics = db.prepare('SELECT COUNT(*) as count FROM analytics').get() as { count: number };
if (!checkAnalytics || checkAnalytics.count === 0) {
  db.prepare(`
    INSERT INTO analytics (totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
    VALUES (0, 0, 0, 0, '')
  `).run();
}

export default db;
