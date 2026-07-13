import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // متغیر provider حذف شد چون سیستم فقط روی بله کار می‌کند
    const { action, phone, idempotencyKey, verification_id, code } = body;

    // کلید نویدا دقیقاً مطابق با نسخه سالم قبلی شما
    const NAVIDAA_API_KEY = process.env.NAVIDAA_API_KEY || "navidaa_live_50fdb6c228f23956277cd71d281906243ff67a66a3d4a394914b46cc4030ea4d";

    if (action === 'send') {
      const cleanPhone = String(phone).trim();

      // ارسال مستقیم به درگاه نویدا و فقط برای کانال بله
      const response = await fetch('https://api.navidaa.ir/v1/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': NAVIDAA_API_KEY,
          'Idempotency-Key': idempotencyKey
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
      return NextResponse.json({ verification_id: data.verification_id });
    }

    if (action === 'verify') {
      const cleanCode = String(code).trim();
      const vId = String(verification_id);

      // تایید مستقیم کد یکبار مصرف ارسال‌شده از نویدا
      const response = await fetch('https://api.navidaa.ir/v1/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': NAVIDAA_API_KEY
        },
        body: JSON.stringify({ verification_id: vId, code: cleanCode })
      });

      if (!response.ok) {
        return NextResponse.json({ verified: false });
      }

      const result = await response.json();
      const isVerified = result.verified || result.status === 'success' || result.data?.verified || false;
      return NextResponse.json({ verified: isVerified });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error) {
    console.error('OTP Internal Error:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 });
  }
}