import { NextResponse } from 'next/server';

const NAVIDAA_API_KEY = process.env.NAVIDAA_API_KEY || '';

export async function POST(request: Request) {
  try {
    if (!NAVIDAA_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const { action, phone, idempotencyKey, verification_id, code } = await request.json();

    // بخش تایید کد ۶ رقمی
    if (action === 'verify') {
      const response = await fetch("https://api.navidaa.ir/v1/otp/verify", {
        method: "POST",
        headers: {
          "X-API-Key": NAVIDAA_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verification_id: verification_id,
          code: code.trim(),
        }),
      });

      const data = await response.json();
      // بازگرداندن دقیق پاسخ سرور نویداا
      return NextResponse.json(data, { status: response.status });
    }

    // بخش ارسال کد OTP
    const response = await fetch("https://api.navidaa.ir/v1/otp/send", {
      method: "POST",
      headers: {
        "X-API-Key": NAVIDAA_API_KEY,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        phone: phone.trim(),
        channels: [{ channel: "bale" }]
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}