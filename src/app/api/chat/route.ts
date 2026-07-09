import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🛡️ حافظه موقت ستاد برای مدیریت ترافیک و مانیتورینگ IP کاربران
const trafficCache = new Map<string, { count: number; resetTime: number }>();

// تنظیمات محدودیت اختصاصی (حداکثر ۷ پیام در دقیقه برای هر فرد)
const MAX_REQUESTS_PER_MINUTE = 7;
const TIME_WINDOW = 60 * 1000; // ۶۰ ثانیه به میلی‌ثانیه

export async function POST(req: Request) {
  try {
    // ۱. استخراج آی‌پورتال (IP) کاربر برای اعمال ریت‌لیمیت هوشمند
    const clientIp = 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('x-real-ip') || 
      'anonymous_user';

    const currentTime = Date.now();
    const userTraffic = trafficCache.get(clientIp);

    // بررسی پنجره زمانی و اعمال محدودیت ترافیک
    if (!userTraffic || currentTime > userTraffic.resetTime) {
      trafficCache.set(clientIp, { count: 1, resetTime: currentTime + TIME_WINDOW });
    } else {
      if (userTraffic.count >= MAX_REQUESTS_PER_MINUTE) {
        console.warn(`⚠️ ترافیک مشکوک و بیش از حد مجاز از آی‌پورتال مسدود شد: ${clientIp}`);
        return NextResponse.json(
          { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱ دقیقه دیگر تلاش فرمایید.' },
          { status: 429 }
        );
      }
      userTraffic.count++;
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'تاریخچه پیام‌ها معتبر نمی‌باشد' }, { status: 400 });
    }

    // خواندن امن کلید هوش مصنوعی از سیستم ریجستری
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

    if (!GEMINI_API_KEY) {
      console.error('تنظیمات سیستم ناقص است: کلید هوش مصنوعی (GEMINI_API_KEY) یافت نشد.');
      return NextResponse.json({ error: 'تنظیمات سرور ناقص است' }, { status: 500 });
    }

    // دستورالعمل‌های هویتی و لحن پدافندی دستیار هوشمند سامانه
    const systemInstructionText = `
      شما پشتیبان و دستیار هوشمند آنلاین و رسمی "سامانه همیار بحران" (مدیریت مردمی حوادث غیرمترقبه) هستید.
      وظیفه شما راهنمایی کاربران در حوزه‌های ثبت گزارش حوادث روی نقشه، فرم داوطلبی و فوریت‌های پزشکی اولیه است.
      لحن شما باید آرامش‌بخش، مقتدر، همدلانه، کاملاً فارسی و بسیار سریع و خلاصه باشد.
    `;

    // کامپایل تاریخچه گفتگو در قالب فیلد تخت input برای فرکانس ساختار تعاملی Interactions API
    let compiledInput = `System Instructions:\n${systemInstructionText}\n\nChat History:\n`;
    messages.forEach((msg: any) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      compiledInput += `${roleLabel}: ${msg.content}\n`;
    });
    compiledInput += `\nAssistant:`;

    const payload = {
      model: "models/gemini-3.5-flash",
      input: compiledInput
    };
    
    let resData;

    // 🔄 سوئیچ و مدیریت هوشمند اتمسفر شبکه (لوکال ویندوز / پروداکشن همروش)
    if (process.env.NODE_ENV === 'development') {
      // 💻 وضعیت لوکال: عبور ترافیک از کانال پروکسی امن Undici و پورت ۱۰۸۰۹ v2ray شما
      const url = `https://generativelanguage.googleapis.com/v1/interactions?key=${GEMINI_API_KEY}`;
      const { request, ProxyAgent } = require('undici');
      
      const dispatcher = new ProxyAgent({
        uri: 'http://127.0.0.1:10809',
        clientOptions: {
          tls: { rejectUnauthorized: false }
        }
      });
      
      console.log("▲ [Dev] ارسال درخواست تعاملی به پورت فیلترشکن لوکال 10809");
      
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
        return NextResponse.json({ error: 'خطا در پاسخ درگاه تعاملی گوگل در محیط لوکال' }, { status: response.statusCode });
      }

      resData = await response.body.json();
    } else {
      // 🚀 [Prod] وضعیت پروداکشن (سرور همروش): شلیک ترافیک به درگاه شتاب‌دهنده اختصاصی کلاودفلر شما
      const url = `https://gateway.ai.cloudflare.com/v1/b76c74f87f433f89e3f3c8f5a4f21624/hamyar-gate/google-ai/v1/interactions?key=${GEMINI_API_KEY}`;
      
      console.log("🚀 [Prod] ارسال درخواست مستقیم از سرور همروش به درگاه کلاودفلر تحریم‌شکن");
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errLog = await response.text();
        console.error('Gemini API Error (Prod):', errLog);
        return NextResponse.json({ error: 'خطا در پاسخ درگاه تعاملی سرور اصلی همروش' }, { status: response.status });
      }

      resData = await response.json();
    }

    // 🚀 استخراج دقیق دیتا از بلاک گام‌های مدل خروجی (model_output) ساختار جدید Steps گوگل
    const modelOutputStep = resData.steps?.find((step: any) => step.type === 'model_output');
    const botReply = modelOutputStep?.content?.[0]?.text || "متأسفانه پاسخی دریافت نشد. مجدداً تلاش فرمایید.";

    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('Gemini Chat Route Internal Error:', error);
    return NextResponse.json({ error: 'خطای داخلی در پردازش هوش مصنوعی ستاد' }, { status: 500 });
  }
}