import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// تشخیص هوشمند محیط اجرای پروداکشن در هم‌روش
const isProduction = process.env.NODE_ENV === 'production';

// اگر روی سرور بود، به پوشه اختصاصی دیسک (/data) متصل می‌شود تا فایل‌های پروژه پاک نشوند
const dbFolder = isProduction 
  ? '/data' 
  : path.join(process.cwd(), 'data');

// ایجاد پوشه دیتابیس در صورت عدم وجود
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, 'database.sqlite');
const db = new Database(dbPath);

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
    rank TEXT
  );
  
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    totalVisVisits INTEGER DEFAULT 0,
    uniqueUsers INTEGER DEFAULT 0,
    mobileHits INTEGER DEFAULT 0,
    desktopHits INTEGER DEFAULT 0,
    lastActiveTime TEXT
  );
`);

export default db;