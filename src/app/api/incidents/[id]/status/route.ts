import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';
import { notifyApprovedVolunteersForIncident } from '@/lib/incident-city-notifications';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (readSession()?.role !== 'senior_admin') {
      return NextResponse.json({ error: 'فقط مدیر ارشد اجازه تغییر وضعیت حادثه را دارد.' }, { status: 403 });
    }
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    const allowedStatuses = ['در دست بررسی', 'تایید شده', 'رد صلاحیت شده', 'تحت کنترل همیار (اعزام نیرو)'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'وضعیت جدید ارسال نشده' }, { status: 400 });
    }

    const incidentBeforeUpdate = db.prepare('SELECT status, city FROM incidents WHERE id = ?').get(id) as
      | { status: string; city: string }
      | undefined;
    if (!incidentBeforeUpdate) {
      return NextResponse.json({ error: 'حادثه یافت نشد' }, { status: 404 });
    }

    const stmt = db.prepare('UPDATE incidents SET status = ? WHERE id = ?');
    const result = stmt.run(status, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'حادثه یافت نشد' }, { status: 404 });
    }

    if (status !== 'تایید شده' && status !== 'تحت کنترل همیار (اعزام نیرو)') {
      db.prepare('UPDATE incident_assignments SET active = 0 WHERE incidentId = ?').run(id);
    }

    const cityNotifications = status === 'تایید شده' && incidentBeforeUpdate.status !== 'تایید شده'
      ? await notifyApprovedVolunteersForIncident(id, incidentBeforeUpdate.city)
      : { failed: 0 };

    return NextResponse.json({
      success: true,
      warning: cityNotifications.failed > 0
        ? 'حادثه تأیید شد، اما ارسال اعلان به برخی همیاران شهر ناموفق بود.'
        : undefined
    });
  } catch (error) {
    console.error('❌ PATCH incident status error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
