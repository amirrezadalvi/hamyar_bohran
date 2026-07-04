// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// آدرس‌دهی مستقیم به پوشه دیسک دائم در سرور هم‌روش
const dbFolder = path.join(process.cwd(), 'data');

// اگر پوشه data وجود نداشت، آن را بساز
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
    lastActiveTime TEXT DEFAULT ''
  );
`);

// اگر جدول analytics خالی بود، یک رکورد پیش‌فرض اضافه کن
const checkAnalytics = db.prepare('SELECT COUNT(*) as count FROM analytics').get() as { count: number };
if (checkAnalytics.count === 0) {
  db.prepare(`
    INSERT INTO analytics (totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
    VALUES (0, 0, 0, 0, '')
  `).run();
}

export default db;