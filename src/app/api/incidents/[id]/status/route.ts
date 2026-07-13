import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendNavidaaMessage } from '@/lib/navidaa';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'وضعیت جدید ارسال نشده' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE incidents SET status = ? WHERE id = ?');
    const result = stmt.run(status, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'حادثه یافت نشد' }, { status: 404 });
    }

    // ✅ فقط در صورت تایید شدن حادثه، پیامک بر اساس شهر ارسال شود
    if (status === 'تایید شده') {
      const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as any;
      
      if (incident && incident.city) {
        // ✅ فیلتر داوطلبان بر اساس شهر
        const volunteers = db
          .prepare('SELECT phone, fullName FROM volunteers WHERE status = ? AND city = ?')
          .all('تایید شده', incident.city) as any[];
        
        console.log(`🔍 Found ${volunteers.length} approved volunteers in city: ${incident.city}`);

        if (volunteers.length > 0) {
          const shortDesc = incident.description.length > 60 
            ? incident.description.substring(0, 60) + '...' 
            : incident.description;

          const messageText = `🚨 فراخوان همیار بحران 🚨\nنوع حادثه: ${incident.type}\nموقعیت: ${shortDesc}\nهمیار گرامی، لطفاً به کارتابل مراجعه کنید(تست برای سایت و اموزش بوده مسیولیت پیام کاملا بر عهده شخص بنده هست).`;

          volunteers.forEach((vol) => {
            console.log(`📤 Sending notification to volunteer: ${vol.fullName} (${vol.phone})`);
            sendNavidaaMessage(vol.phone, messageText)
              .then(res => console.log(`✅ Notification Response for ${vol.phone}:`, res))
              .catch(err => console.error(`❌ Notification Error for ${vol.phone}:`, err));
          });
        } else {
          console.log(`⚠️ No approved volunteers found in city: ${incident.city}`);
        }
      } else {
        console.log('⚠️ Incident has no city specified. SMS broadcast skipped.');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ PATCH incident status error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}