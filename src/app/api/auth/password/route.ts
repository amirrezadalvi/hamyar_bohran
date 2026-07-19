import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';
import { hashPassword, validateNewPassword, verifyPassword } from '@/lib/password';

const attempts = new Map<number, { count: number; resetAt: number }>();

export async function PATCH(req: Request) {
  const session = readSession();
  if (session?.role !== 'approved_volunteer' || !session.volunteerId) {
    return NextResponse.json({ error: 'برای تغییر گذرواژه باید به‌عنوان همیار تأییدشده وارد شوید.' }, { status: 403 });
  }

  const now = Date.now();
  const rate = attempts.get(session.volunteerId);
  if (rate && rate.resetAt > now && rate.count >= 5) {
    return NextResponse.json({ error: 'تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.' }, { status: 429 });
  }

  try {
    const { currentPassword, newPassword, confirmation } = await req.json();
    const current = String(currentPassword || '');
    const next = String(newPassword || '');
    const confirmed = String(confirmation || '');

    const validationError = validateNewPassword(next);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    if (next !== confirmed) return NextResponse.json({ error: 'تکرار گذرواژه جدید مطابقت ندارد.' }, { status: 400 });
    if (next === current) return NextResponse.json({ error: 'گذرواژه جدید نباید با گذرواژه فعلی یکسان باشد.' }, { status: 400 });

    const volunteer = db.prepare(`
      SELECT id, fixedPassword FROM volunteers WHERE id = ? AND status = 'تایید شده' LIMIT 1
    `).get(session.volunteerId) as { id: number; fixedPassword: string } | undefined;
    if (!volunteer) {
      return NextResponse.json({ error: 'صلاحیت شما برای ورود به پنل همیار تأیید نشده است.' }, { status: 403 });
    }
    if (!volunteer.fixedPassword || !verifyPassword(current, volunteer.fixedPassword)) {
      const nextRate = rate && rate.resetAt > now ? rate : { count: 0, resetAt: now + 15 * 60 * 1000 };
      nextRate.count += 1;
      attempts.set(session.volunteerId, nextRate);
      return NextResponse.json({ error: 'گذرواژه فعلی نادرست است.' }, { status: 401 });
    }

    db.prepare('UPDATE volunteers SET fixedPassword = ? WHERE id = ?').run(hashPassword(next), session.volunteerId);
    attempts.delete(session.volunteerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Volunteer password update error:', error);
    return NextResponse.json({ error: 'خطای داخلی در تغییر گذرواژه' }, { status: 500 });
  }
}
