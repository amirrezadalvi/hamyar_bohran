import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { clearVerifiedPhone, readSession, readVerifiedPhone } from '@/lib/auth';
import { sendNavidaaMessage } from '@/lib/navidaa';
import { normalizeCity, normalizeMatchableCity } from '@/lib/cities';
import { areValidCoordinates, nearestSupportedCity } from '@/lib/geocoding';
import { notifyApprovedVolunteersForIncident } from '@/lib/incident-city-notifications';

export const dynamic = 'force-dynamic';

async function sendIncidentSmsOnce(
  incidentId: number,
  recipientKey: string,
  notificationType: 'reporter_confirmation' | 'same_city_volunteer',
  phone: string,
  message: string
) {
  const claimed = db.prepare(`
    INSERT OR IGNORE INTO incident_sms_notifications
      (incidentId, recipientKey, notificationType, status)
    VALUES (?, ?, ?, 'pending')
  `).run(incidentId, recipientKey, notificationType);
  if (claimed.changes === 0) return { success: true, skipped: true };

  const result = await sendNavidaaMessage(
    phone,
    message,
    `${notificationType}-${incidentId}-${recipientKey}`
  );
  db.prepare(`
    UPDATE incident_sms_notifications
    SET status = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE incidentId = ? AND recipientKey = ? AND notificationType = ?
  `).run(result.success ? 'sent' : 'failed', incidentId, recipientKey, notificationType);
  return result;
}

export async function GET() {
  try {
    const session = readSession();
    const canSeeAll = session?.role === 'senior_admin';
    const approvedVolunteer = session?.role === 'approved_volunteer'
      ? db.prepare("SELECT id, city FROM volunteers WHERE id = ? AND status = 'تایید شده'").get(session.volunteerId) as { id: number; city: string } | undefined
      : null;
    if (session?.role === 'approved_volunteer' && !approvedVolunteer) {
      return NextResponse.json({ error: 'صلاحیت شما برای مشاهده حوادث تأیید نشده است.' }, { status: 403 });
    }
    const canSeeAssignments = canSeeAll || Boolean(approvedVolunteer);
    const volunteerCity = normalizeMatchableCity(approvedVolunteer?.city);
    const rows = (canSeeAll
      ? db.prepare('SELECT * FROM incidents ORDER BY id DESC').all()
      : approvedVolunteer
        ? volunteerCity
          ? db.prepare(`
              SELECT * FROM incidents
              WHERE status IN ('تایید شده', 'تحت کنترل همیار (اعزام نیرو)') AND city = ?
              ORDER BY id DESC
            `).all(volunteerCity)
          : []
      : db.prepare(`
          SELECT * FROM incidents
          WHERE status IN ('تایید شده', 'تحت کنترل همیار (اعزام نیرو)')
          ORDER BY id DESC
        `).all()) as any[];

    const assignmentStmt = db.prepare(`
      SELECT v.fullName
      FROM incident_assignments ia
      JOIN volunteers v ON v.id = ia.volunteerId
      WHERE ia.incidentId = ?
      ORDER BY ia.createdAt ASC
    `);
    
    const incidents = rows.map(row => ({
      ...row,
      reporterPhone: canSeeAll ? row.reporterPhone : undefined,
      assignedHamyars: canSeeAssignments
        ? (assignmentStmt.all(row.id) as { fullName: string }[]).map(item => item.fullName)
        : []
    }));
    
    return NextResponse.json(incidents);
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = readSession();
    console.log("🚨 Received new incident report:", body.type);

    const incidentId = Number(body.id);
    const latitude = Number(body.mapLat ?? body.lat);
    const longitude = Number(body.mapLng ?? body.lng);
    const reporterName = String(body.reporterName || '').trim();
    const reporterPhone = String(body.reporterPhone || '').trim();
    if (!Number.isInteger(incidentId) || !reporterName || !/^09\d{9}$/.test(reporterPhone)) {
      return NextResponse.json({ error: 'اطلاعات گزارش‌دهنده یا شناسه گزارش نامعتبر است.' }, { status: 400 });
    }
    if (!areValidCoordinates(latitude, longitude)) {
      return NextResponse.json({ error: 'مختصات حادثه نامعتبر است.' }, { status: 400 });
    }
    const incidentCity = normalizeCity(body.city)
      || nearestSupportedCity(latitude, longitude)
      || 'سایر شهرهای ایران';
    const incidentAddress = String(body.manualAddress || '').trim()
      || 'آدرس دقیق موقتاً در دسترس نیست، موقعیت روی نقشه ذخیره شد.';
    if (session?.role !== 'senior_admin' && readVerifiedPhone('incident_report') !== reporterPhone) {
      return NextResponse.json({ error: 'شماره همراه گزارش‌دهنده تأیید نشده است.' }, { status: 403 });
    }

    const stmt = db.prepare(`
      INSERT INTO incidents (
        id, type, severityValue, description, reporterName, reporterPhone,
        lat, lng, status, likes, dislikes, assignedHamyars,
        manualAddress, mapLat, mapLng, city
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const initialStatus = session?.role === 'senior_admin' ? 'تایید شده' : 'در دست بررسی';
    stmt.run(
      incidentId,
      body.type,
      body.severityValue,
      body.description,
      reporterName,
      reporterPhone,
      latitude,
      longitude,
      initialStatus,
      body.likes || 0,
      body.dislikes || 0,
      JSON.stringify(body.assignedHamyars || []),
      incidentAddress,
      latitude,
      longitude,
      incidentCity
    );
    if (session?.role !== 'senior_admin') clearVerifiedPhone();

    const message = `${reporterName} گرامی\nگزارش شما با موفقیت در سامانه همیار بحران ثبت شد.\nاز همکاری و مسئولیت‌پذیری شما سپاسگزاریم.\nلطفاً آرامش خود را حفظ کرده و در صورت وجود خطر از محل ناامن فاصله بگیرید.\nکد پیگیری: ${incidentId}`;
    const sms = await sendIncidentSmsOnce(
      incidentId,
      `phone:${reporterPhone}`,
      'reporter_confirmation',
      reporterPhone,
      message
    );

    const cityNotifications = initialStatus === 'تایید شده'
      ? await notifyApprovedVolunteersForIncident(incidentId, incidentCity)
      : { attempted: 0, failed: 0 };

    return NextResponse.json({
      success: true,
      trackingCode: incidentId,
      smsDelivered: sms.success,
      city: incidentCity,
      warning: !sms.success
        ? 'گزارش ثبت شد، اما ارسال پیامک تأیید ناموفق بود.'
        : cityNotifications.failed > 0
          ? 'گزارش ثبت شد، اما ارسال اعلان به برخی همیاران شهر ناموفق بود.'
          : undefined
    }, { status: 201 });
  } catch (error) {
    console.error('POST Incident Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
