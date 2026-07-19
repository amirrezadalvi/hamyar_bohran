import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { ADMIN_PHONE, createOtpBinding, parseVolunteerSkills, readOtpBinding, setSession, setVerifiedPhone } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const sendAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // متغیر provider حذف شد چون سیستم فقط روی بله کار می‌کند
    const { action, phone, verification_id, code, purpose } = body;

    // کلید نویدا دقیقاً مطابق با نسخه سالم قبلی شما
    const NAVIDAA_API_KEY = process.env.NAVIDAA_API_KEY;
    if (!NAVIDAA_API_KEY) {
      return NextResponse.json({ error: 'تنظیمات سرویس پیامک کامل نیست.' }, { status: 503 });
    }

    if (action === 'send') {
      const cleanPhone = String(phone).trim();
      const allowedPurposes = ['login', 'incident_report', 'volunteer_application'];
      if (!/^09\d{9}$/.test(cleanPhone) || !allowedPurposes.includes(purpose)) {
        return NextResponse.json({ error: 'شماره همراه یا نوع درخواست نامعتبر است.' }, { status: 400 });
      }
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'anonymous';
      const rateKey = crypto.createHash('sha256').update(`${clientIp}:${cleanPhone}`).digest('hex');
      const now = Date.now();
      const rate = sendAttempts.get(rateKey);
      if (rate && rate.resetAt > now && rate.count >= 3) {
        return NextResponse.json({ error: 'تعداد درخواست‌های پیامک بیش از حد مجاز است. لطفاً بعداً تلاش کنید.' }, { status: 429 });
      }
      const nextRate = rate && rate.resetAt > now ? rate : { count: 0, resetAt: now + 10 * 60 * 1000 };
      nextRate.count += 1;
      sendAttempts.set(rateKey, nextRate);

      // ارسال مستقیم به درگاه نویدا و فقط برای کانال بله
      const response = await fetch('https://api.navidaa.ir/v1/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': NAVIDAA_API_KEY,
          'Idempotency-Key': `otp-${crypto.randomBytes(12).toString('hex')}`
        },
        body: JSON.stringify({
          phone: cleanPhone,
          channels: [{ channel: "bale" }],
          channel_timeout: 60
        })
      });

      if (!response.ok) {
        const errData = await response.text();
        console.error('Navidaa OTP Send Error:', errData);
        return NextResponse.json({ error: 'خطا در درگاه نویدا' }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json({ verification_id: createOtpBinding(data.verification_id, cleanPhone, purpose) });
    }

    if (action === 'verify') {
      const binding = readOtpBinding(String(verification_id || ''));
      if (!binding) {
        return NextResponse.json({ verified: false, error: 'درخواست تأیید نامعتبر یا منقضی شده است.' }, { status: 400 });
      }
      const cleanCode = String(code).trim();
      if (!/^\d{4,8}$/.test(cleanCode)) {
        return NextResponse.json({ verified: false, error: 'کد تأیید نامعتبر است.' }, { status: 400 });
      }

      // تایید مستقیم کد یکبار مصرف ارسال‌شده از نویدا
      const response = await fetch('https://api.navidaa.ir/v1/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': NAVIDAA_API_KEY
        },
        body: JSON.stringify({ verification_id: binding.providerId, code: cleanCode })
      });

      if (!response.ok) {
        return NextResponse.json({ verified: false });
      }

      const result = await response.json();
      const isVerified = result.verified || result.status === 'success' || result.data?.verified || false;
      if (!isVerified) {
        return NextResponse.json({ verified: isVerified });
      }

      const verifiedPhone = binding.phone;
      if (binding.purpose === 'incident_report' || binding.purpose === 'volunteer_application') {
        setVerifiedPhone(verifiedPhone, binding.purpose);
        return NextResponse.json({ verified: true });
      }

      if (ADMIN_PHONE && verifiedPhone === ADMIN_PHONE) {
        const user = { role: 'senior_admin' as const, fullName: 'مدیر ارشد', phone: ADMIN_PHONE };
        setSession(user);
        return NextResponse.json({ verified: true, user });
      }

      const volunteer = db.prepare(`
        SELECT id, fullName, phone, nationalId, skills, job, address, status,
               rank, gender, birthDate, city
        FROM volunteers WHERE phone = ? AND status = 'تایید شده' LIMIT 1
      `).get(verifiedPhone) as any;
      if (!volunteer) {
        return NextResponse.json({ error: 'پرونده داوطلبی این شماره هنوز تایید نشده است.' }, { status: 403 });
      }

      volunteer.skills = parseVolunteerSkills(volunteer.skills);
      setSession({ role: 'approved_volunteer', volunteerId: volunteer.id, fullName: volunteer.fullName, phone: volunteer.phone });
      return NextResponse.json({ verified: true, user: { role: 'approved_volunteer', volunteer } });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error) {
    console.error('OTP Internal Error:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 });
  }
}
