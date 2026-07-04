// src/app/api/otp/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, phone, idempotencyKey, verification_id, code } = body;

    // توکن ثابت پنل نویداا شما
    const NAVIDAA_API_KEY = "navidaa_live_50fdb6c228f23956277cd71d281906243ff67a66a3d4a394914b46cc4030ea4d"; // این‌جا توکن واقعی خودت را جایگزین کن

    // ۱. درخواست ارسال کد (Send OTP)
    if (action === 'send') {
      const response = await fetch('https://api.navidaa.ir/v1/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': NAVIDAA_API_KEY,
          'Idempotency-Key': idempotencyKey // حتماً ارسال می‌شود تا مانع تکرار شود
        },
        body: JSON.stringify({
          phone: String(phone).trim(),
          channels: [
            { channel: "bale" } // فقط کانال بله پایداری دارد و اس‌ام‌اس حذف شد
          ],
          channel_timeout: 60
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Navidaa gateway error status: ${response.status} - ${errorText}`);
        return NextResponse.json({ error: 'خطا در درگاه نویداا' }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json({ verification_id: data.verification_id });
    }

    // ۲. تایید کد وارد شده (Verify OTP)
    if (action === 'verify') {
      const response = await fetch('https://api.navidaa.ir/v1/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': NAVIDAA_API_KEY
        },
        body: JSON.stringify({
          verification_id: verification_id,
          code: String(code).trim()
        })
      });

      if (!response.ok) {
        return NextResponse.json({ verified: false, error: 'کد نامعتبر یا خطا در تایید' });
      }

      const result = await response.json();
      return NextResponse.json({ verified: result.verified });
    }

    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 });

  } catch (error) {
    console.error('OTP Route Internal Error:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور پدافند' }, { status: 500 });
  }
}