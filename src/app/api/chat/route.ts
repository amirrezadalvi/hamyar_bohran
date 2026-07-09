import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🛡️ مانیتورینگ و حافظه پدافندی برای کنترل ترافیک بر اساس IP کاربران
const trafficCache = new Map<string, { count: number; resetTime: number }>();

// تنظیمات محدودیت اختصاصی ستاد (۷ درخواست در دقیقه برای هر فرد)
const MAX_REQUESTS_PER_MINUTE = 7;
const TIME_WINDOW = 60 * 1000; // ۶۰ ثانیه به میلی‌ثانیه

export async function POST(req: Request) {
  try {
    // ۱. استخراج آی‌پورتال (IP) کاربر برای اعمال محدودیت
    const clientIp = 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('x-real-ip') || 
      'anonymous_user';

    const currentTime = Date.now();
    const userTraffic = trafficCache.get(clientIp);

    // بررسی و اعمال محدودیت هوشمند
    if (!userTraffic || currentTime > userTraffic.resetTime) {
      // اگر کاربر جدید است یا زمان پنجرهٔ قبلی تمام شده، شمارنده بازنشانی می‌شود
      trafficCache.set(clientIp, { count: 1, resetTime: currentTime + TIME_WINDOW });
    } else {
      // اگر کاربر در حال اسپم کردن است و از حد مجاز رد شده
      if (userTraffic.count >= MAX_REQUESTS_PER_MINUTE) {
        console.warn(`⚠️ ترافیک مشکوک از آی‌پورتال مسدود شد: ${clientIp}`);
        return NextResponse.json(
          { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱ دقیقه دیگر تلاش فرمایید.' },
          { status: 429 } // کد وضعیت استاندارد Too Many Requests
        );
      }
      // افزودن به شمارنده درخواست‌های کاربر
      userTraffic.count++;
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'تاریخچه پیام‌ها معتبر نمی‌باشد' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

    if (!GEMINI_API_KEY) {
      console.error('تنظیمات سیستم ناقص است: کلید هوش مصنوعی در فایل .env.local تعریف نشده است.');
      return NextResponse.json({ error: 'تنظیمات سرور ناقص است' }, { status: 500 });
    }

    const systemInstructionText = `
      شما پشتیبان و دستیار هوشمند آنلاین و رسمی "سامانه همیار بحران" (مدیریت مردمی حوادث غیرمترقبه) هستید.
      وظیفه شما راهنمایی کاربران در حوزه‌های ثبت گزارش حوادث روی نقشه، فرم داوطلبی و فوریت‌های پزشکی اولیه است.
      لحن شما باید آرامش‌بخش، مقتدر، همدلانه، کاملاً فارسی و بسیار سریع و خلاصه باشد.
    `;

    let compiledInput = `System Instructions:\n${systemInstructionText}\n\nChat History:\n`;
    messages.forEach((msg: any) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      compiledInput += `${roleLabel}: ${msg.content}\n`;
    });
    compiledInput += `\nAssistant:`;

    // تنظیم مدل روی سبک‌ترین حالت ممکن بر اساس داک جدید
    const payload = {
      model: "models/gemini-3.5-flash",
      input: compiledInput
    };
    
    const url = `https://generativelanguage.googleapis.com/v1/interactions?key=${GEMINI_API_KEY}`;
    let resData;

    if (process.env.NODE_ENV === 'development') {
      const { request, ProxyAgent } = require('undici');
      
      const dispatcher = new ProxyAgent({
        uri: 'http://127.0.0.1:10809',
        clientOptions: {
          tls: { rejectUnauthorized: false }
        }
      });
      
      const response = await request(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'connection': 'close'
        },
        body: JSON.stringify(payload),
        dispatcher
      });

      if (response.statusCode !== 200) {
        const errLog = await response.body.text();
        console.error('Gemini Interactions API Error (Dev):', errLog);
        return NextResponse.json({ error: 'خطا در پاسخ درگاه تعاملی گوگل' }, { status: response.statusCode });
      }

      resData = await response.body.json();
    } else {
      // حالت سرور اصلی (همروش) بدون نیاز به پروکسی لوکال
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errLog = await response.text();
        console.error('Gemini Interactions API Error (Prod):', errLog);
        return NextResponse.json({ error: 'خطا در پاسخ درگاه تعاملی اصلی گوگل' }, { status: response.status });
      }

      resData = await response.json();
    }

    const modelOutputStep = resData.steps?.find((step: any) => step.type === 'model_output');
    const botReply = modelOutputStep?.content?.[0]?.text || "متأسفانه پاسخی دریافت نشد. مجدداً تلاش فرمایید.";

    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('Gemini Chat Route Internal Error:', error);
    return NextResponse.json({ error: 'خطای داخلی در پردازش هوش مصنوعی ستاد' }, { status: 500 });
  }
}