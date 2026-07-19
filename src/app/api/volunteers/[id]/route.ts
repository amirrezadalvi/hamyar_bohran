import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';
import { generateTemporaryPassword, hashPassword } from '@/lib/password';
import { sendNavidaaMessage } from '@/lib/navidaa';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (readSession()?.role !== 'senior_admin') {
      return NextResponse.json({ error: 'فقط مدیر ارشد اجازه بررسی پرونده داوطلب را دارد.' }, { status: 403 });
    }
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    const allowedStatuses = ['در انتظار تایید', 'تایید شده', 'رد صلاحیت شده'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'وضعیت جدید ارسال نشده' }, { status: 400 });
    }

    const volunteer = db.prepare(`
      SELECT id, fullName, phone, status FROM volunteers WHERE id = ? LIMIT 1
    `).get(id) as { id: number; fullName: string; phone: string; status: string } | undefined;
    if (!volunteer) {
      return NextResponse.json({ error: 'داوطلب یافت نشد' }, { status: 404 });
    }

    if (status !== 'تایید شده') {
      db.prepare('UPDATE volunteers SET status = ? WHERE id = ?').run(status, id);
      return NextResponse.json({ success: true });
    }

    if (volunteer.status === 'تایید شده') {
      return NextResponse.json({ error: 'این داوطلب قبلاً تأیید شده است و پیام تأیید دوباره ارسال نشد.' }, { status: 409 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = hashPassword(temporaryPassword);
    const result = db.prepare(`
      UPDATE volunteers
      SET status = 'تایید شده', fixedPassword = ?,
          rank = COALESCE(NULLIF(rank, ''), 'امدادگر رسمی'), approvalSmsStatus = 'pending'
      WHERE id = ? AND status != 'تایید شده'
    `).run(passwordHash, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'این داوطلب قبلاً تأیید شده است.' }, { status: 409 });
    }

    const message = `داوطلب گرامی ${volunteer.fullName}\nاطلاعات شما جهت همیاری در سامانه همیار بحران تأیید شد.\nرمز ورود موقت شما: ${temporaryPassword}\nپس از ورود می‌توانید گذرواژه خود را از پنل کاربری تغییر دهید.\nاز اعتماد و همراهی شما سپاسگزاریم.`;
    const sms = await sendNavidaaMessage(volunteer.phone, message, `volunteer-approval-${id}`);
    db.prepare(`
      UPDATE volunteers SET approvalSmsStatus = ?, approvalSmsSentAt = ? WHERE id = ?
    `).run(sms.success ? 'sent' : 'failed', sms.success ? new Date().toISOString() : null, id);

    if (!sms.success) {
      return NextResponse.json({
        success: true,
        smsDelivered: false,
        warning: 'پرونده تأیید شد، اما ارسال پیامک رمز موقت ناموفق بود. لطفاً تنظیمات سرویس پیامک را بررسی کنید.'
      });
    }

    return NextResponse.json({ success: true, smsDelivered: true });
  } catch (error) {
    console.error('❌ PATCH volunteer status error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
