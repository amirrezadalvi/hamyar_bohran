import { NextResponse } from 'next/server';
import { areValidCoordinates, reverseGeocodeIranianCity } from '@/lib/geocoding';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const latitude = typeof body.lat === 'string' ? Number(body.lat.trim()) : Number(body.lat);
    const longitude = typeof body.lng === 'string' ? Number(body.lng.trim()) : Number(body.lng);
    if (body.lat === '' || body.lng === '' || !areValidCoordinates(latitude, longitude)) {
      return NextResponse.json({ error: 'عرض یا طول جغرافیایی نامعتبر است.' }, { status: 422 });
    }
    const result = await reverseGeocodeIranianCity(latitude, longitude, {
      allowProviderFallback: true
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'بدنه درخواست یا مختصات ارسالی نامعتبر است.' }, { status: 422 });
    }
    return NextResponse.json({
      city: 'سایر شهرهای ایران',
      address: 'آدرس دقیق موقتاً در دسترس نیست، موقعیت روی نقشه ذخیره شد.',
      approximate: true,
      providerAvailable: false
    });
  }
}
