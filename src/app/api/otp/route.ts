import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, phone, idempotencyKey, verification_id, code, provider } = body;

    // 🔴 توکن معتبر کاوه‌نگار خود را حتماً به جای عبارت زیر جایگزین کنید (علت ارور 403)
    const KAVENEGAR_API_KEY = "YOUR_KAVENEGAR_API_KEY"; 
    const KAVENEGAR_TEMPLATE = "myverification"; 
    const NAVIDAA_API_KEY = "navidaa_live_50fdb6c228f23956277cd71d281906243ff67a66a3d4a394914b46cc4030ea4d";

    if (action === 'send') {
      const cleanPhone = String(phone).trim();

      if (provider === 'sms') {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        const kavenegarUrl = `https://api.kavenegar.com/v1/${'36745945314C7069735A486F2F6D4E74524232793661674F784B54356738497662327A4E64307A4C325A773D'}/verify/lookup.json?receptor=${cleanPhone}&token=${generatedCode}&template=${KAVENEGAR_TEMPLATE}`;
        
        const response = await fetch(kavenegarUrl, { method: 'GET' });
        const resData = await response.json();

        if (!response.ok || (resData.return && resData.return.status !== 200)) {
          console.error('Kavenegar Gateway Error Response:', resData);
          return NextResponse.json(
            { error: resData.return?.message || 'خطا در درگاه کاوه‌نگار' }, 
            { status: response.status || 403 }
          );
        }

        return NextResponse.json({ verification_id: `sms-${cleanPhone}-${generatedCode}` });
      } else {
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
          return NextResponse.json({ error: 'خطا در درگاه نویداا' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ verification_id: data.verification_id });
      }
    }

    if (action === 'verify') {
      const cleanCode = String(code).trim();
      const vId = String(verification_id);

      if (vId.startsWith('sms-')) {
        const expectedCode = vId.split('-')[2];
        return NextResponse.json({ verified: cleanCode === expectedCode });
      }

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