import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// تشخیص هوشمند محیط اجرای پروداکشن در هم‌روش
const isProduction = process.env.NODE_ENV === 'production';

// اگر روی سرور بود، به پوشه اختصاصی دیسک (/data) متصل می‌شود
const dbFolder = isProduction 
  ? '/data' 
  : path.join(process.cwd(), 'data');

// ایجاد پوشه دیتابیس در صورت عدم وجود
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'database.sqlite');

// --- شروع بخش اصلاح شده برای پایداری در لوکال ---
let db: Database.Database;

if (isProduction) {
  db = new Database(dbPath);
} else {
  if (!(global as any)._db) {
    (global as any)._db = new Database(dbPath);
  }
  db = (global as any)._db;
}
// --- پایان بخش اصلاح شده ---

// تنظیم حالت WAL برای افزایش کارایی و جلوگیری از کراش ناخواسته در SQLite
db.pragma('journal_mode = WAL');

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

// اگر جدول analytics خالی بود، یک رکورد پیش‌فرض اضافه کن
const checkAnalytics = db.prepare('SELECT COUNT(*) as count FROM analytics').get() as { count: number };
if (!checkAnalytics || checkAnalytics.count === 0) {
  db.prepare(`
    INSERT INTO analytics (totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
    VALUES (0, 0, 0, 0, '')
  `).run();
}

export default db;