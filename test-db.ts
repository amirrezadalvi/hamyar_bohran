import db from './src/lib/db';

try {
  // تست درج یک داوطلب آزمایشی
  const stmt = db.prepare('INSERT INTO volunteers (fullName, phone, status) VALUES (?, ?, ?)');
  stmt.run('امیررضا دلوی', '09912201633', 'تست موفق');
  
  // خواندن اطلاعات برای اطمینان
  const user = db.prepare('SELECT * FROM volunteers WHERE fullName = ?').get('امیررضا دلوی');
  console.log('✅ دیتابیس با موفقیت ساخته شد! اطلاعات درج شده:', user);
} catch (e) {
  console.error('❌ خطا در دیتابیس:', e);
}