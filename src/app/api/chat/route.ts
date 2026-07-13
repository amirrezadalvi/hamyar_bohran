import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 🛡️ حافظه موقت برای مدیریت ترافیک و ریت‌لیمیت کاربران (امنیت پروداکشن)
const trafficCache = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 30; // 👈 ارتقا به ۳۰ درخواست جهت جلوگیری از بلاک شدن زودهنگام در زمان تست
const TIME_WINDOW = 60 * 1000; 

export async function POST(req: Request) {
  try {
    // ۱. ریت‌لیمیت هوشمند بر اساس IP کاربر
    const clientIp = 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('x-real-ip') || 
      'anonymous_user';

    const currentTime = Date.now();
    const userTraffic = trafficCache.get(clientIp);

    if (!userTraffic || currentTime > userTraffic.resetTime) {
      trafficCache.set(clientIp, { count: 1, resetTime: currentTime + TIME_WINDOW });
    } else {
      if (userTraffic.count >= MAX_REQUESTS_PER_MINUTE) {
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

    // 🛡️ استراتژی خشاب ۴ کلیده: خواندن ۴ کلید از پنل همروش یا فایل لوکال
    const keysPool = [
      process.env.GEMINI_API_KEY,   // اکانت اول
      process.env.GEMINI_API_KEY_2, // اکانت دوم
      process.env.GEMINI_API_KEY_3, // اکانت سوم
      process.env.GEMINI_API_KEY_4, // اکانت چهارم
    ].filter(Boolean); // کلیدهای خالی را نادیده می‌گیرد

    if (keysPool.length === 0) {
      console.error('تنظیمات سیستم ناقص است: کلید هوش مصنوعی در فایل محیطی تعریف نشده است.');
      return NextResponse.json({ error: 'تنظیمات سرور ناقص است' }, { status: 500 });
    }

    // انتخاب رندوم یک کلید برای تقسیم فشار ترافیک و جلوگیری از لیمیت روزانه
    const ACTIVE_API_KEY = keysPool[Math.floor(Math.random() * keysPool.length)];

    // 🛑 گاردریل (حصار امنیتی): محدود کردن شدید هوش مصنوعی فقط به تخصص‌های سامانه
    const systemInstructionText = `
      شما پشتیبان و دستیار هوشمند آنلاین و رسمی "سامانه همیار بحران" (مدیریت مردمی حوادث غیرمترقبه) هستید.
      
      وظایف و حوزه‌های مجاز پاسخگویی شما (فقط و فقط):
      ۱. راهنمایی کاربران برای استفاده از امکانات سامانه (ثبت گزارش، فرم داوطلبی، کارتابل و غیره).
      ۲. فوریت‌های پزشکی، امداد و نجات اولیه و اقدامات حیاتی در حوادث (زلزله، آتش‌سوزی، تصادفات و...).
      ۳. مدیریت بحران و پدافند غیرعامل.
      ۴. حمایت‌های روان‌شناختی، آرامش‌بخشی به قربانیان و کنترل استرس در شرایط اضطراری.

      قوانین امنیتی و محدودیت‌های مطلق (Guardrails):
      شما مطلقاً اجازه ندارید به سوالات خارج از حوزه‌های بالا پاسخ دهید. 
      پاسخگویی به سوالات برنامه‌نویسی (کدنویسی، بهبود کد، دیباگ)، ریاضیات، فیزیک، تاریخ، سرگرمی، جوک، مسائل سیاسی، ترجمه متون نامربوط و هرگونه سوال متفرقه اکیداً ممنوع است.
      
      اگر کاربری سوال متفرقه‌ای پرسید که خارج از چارچوب بالا بود، تحت هیچ شرایطی جواب سوال را ندهید و فقط و فقط از این الگوی ثابت استفاده کنید:
      "من دستیار تخصصی سامانه همیار بحران هستم و وظیفه‌ام صرفاً راهنمایی در زمینه فوریت‌های پزشکی، امداد اولیه، حمایت‌های روان‌شناختی و استفاده از سامانه است. متأسفانه قادر به پاسخگویی به این نوع سوالات متفرقه نیستم."

      لحن شما: مقتدر، آرامش‌بخش، همدلانه، کاملاً فارسی و بسیار سریع و خلاصه باشد.
    `;

    // ✂️ کات کردن تاریخچه: فقط ۶ پیام آخر را برای کاهش مصرف سهمیه به گوگل می‌فرستیم
    const recentMessages = messages.slice(-6);

    // کامپایل تاریخچه چت در قالب یک prompt یکپارچه برای ساختار رسمی Interactions API
    let compiledInput = `System Instructions:\n${systemInstructionText}\n\nChat History:\n`;
    recentMessages.forEach((msg: any) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      compiledInput += `${roleLabel}: ${msg.content}\n`;
    });
    compiledInput += `\nAssistant:`;

    const payload = {
      model: "models/gemini-3.5-flash",
      input: compiledInput
    };
    
    let resData;

    // 🔄 سوئیچ هوشمند شبکه بین لوکال و سرور اصلی همروش
    if (process.env.NODE_ENV === 'development') {
      // 💻 لوکال شما: فراخوانی مستقیم درگاه Interactions گوگل با کلید چرخشی فعال
      const url = `https://generativelanguage.googleapis.com/v1/interactions?key=${ACTIVE_API_KEY}`;
      const { request, ProxyAgent } = require('undici');
      
      const dispatcher = new ProxyAgent({
        uri: 'http://127.0.0.1:10809',
        clientOptions: {
          tls: { rejectUnauthorized: false }
        }
      });
      
      console.log("▲ [Dev] ارسال درخواست رسمی Interactions API با سیستم Key Rotation");
      
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
      // 🚀 پروداکشن همروش: شلیک ترافیک به شتاب‌دهنده کلاودفلر با کلید چرخشی فعال
      const url = `https://gateway.ai.cloudflare.com/v1/b76c74f87f433f89e3f3c8f5a4f21624/hamyar-gate/google-ai-studio/v1/interactions?key=${ACTIVE_API_KEY}`;
      
      console.log("🚀 [Prod] ارسال درخواست مستقیم از سرور همروش به درگاه کلاودفلر تحریم‌شکن");
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errLog = await response.text();
        console.error('Gemini Interactions API Error (Prod):', errLog);
        return NextResponse.json({ error: 'خطا در پاسخ درگاه تعاملی اصلی گوگل روی سرور همروش' }, { status: response.status });
      }

      resData = await response.json();
    }

    // 🚀 استخراج دقیق و هوشمند متن از مدل خروجی ساختار جدید Steps گوگل بر اساس داکس شما
    const modelOutputStep = resData.steps?.find((step: any) => step.type === 'model_output');
    const botReply = modelOutputStep?.content?.[0]?.text || "متأسفانه پاسخی دریافت نشد. مجدداً تلاش فرمایید.";

    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error('Gemini Chat Route Internal Error:', error);
    return NextResponse.json({ error: 'خطای داخلی در پردازش هوش مصنوعی ستاد' }, { status: 500 });
  }
}