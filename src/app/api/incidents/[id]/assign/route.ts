import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';
import { sendNavidaaMessage } from '@/lib/navidaa';
import { normalizeCity } from '@/lib/cities';

const ACTIVE_INCIDENT_STATUSES = ['تایید شده', 'تحت کنترل همیار (اعزام نیرو)'];

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = readSession();
  if (session?.role !== 'approved_volunteer' || !session.volunteerId) {
    return NextResponse.json({ error: 'فقط همیار تاییدشده اجازه پذیرش مأموریت را دارد.' }, { status: 403 });
  }

  const incidentId = Number(params.id);
  if (!Number.isInteger(incidentId) || incidentId <= 0) {
    return NextResponse.json({ error: 'شناسه حادثه نامعتبر است.' }, { status: 400 });
  }

  try {
    const assignment = db.transaction(() => {
      const volunteer = db.prepare('SELECT id, fullName, phone, status, city FROM volunteers WHERE id = ?').get(session.volunteerId) as any;
      if (!volunteer || volunteer.status !== 'تایید شده') {
        throw new Error('VOLUNTEER_NOT_APPROVED');
      }

      const incident = db.prepare(`
        SELECT id, type, description, manualAddress, lat, lng, mapLat, mapLng, status, city
        FROM incidents WHERE id = ?
      `).get(incidentId) as any;
      if (!incident) throw new Error('INCIDENT_NOT_FOUND');
      if (!ACTIVE_INCIDENT_STATUSES.includes(incident.status)) throw new Error('INCIDENT_NOT_APPROVED');
      const volunteerCity = normalizeCity(volunteer.city);
      const incidentCity = normalizeCity(incident.city);
      if (!volunteerCity || !incidentCity || volunteerCity !== incidentCity) throw new Error('INCIDENT_CITY_MISMATCH');

      const duplicate = db.prepare(`
        SELECT id FROM incident_assignments WHERE incidentId = ? AND volunteerId = ?
      `).get(incidentId, session.volunteerId);
      if (duplicate) throw new Error('DUPLICATE_ASSIGNMENT');

      const active = db.prepare(`
        SELECT ia.id
        FROM incident_assignments ia
        JOIN incidents i ON i.id = ia.incidentId
        WHERE ia.volunteerId = ? AND ia.active = 1
          AND i.status IN ('تایید شده', 'تحت کنترل همیار (اعزام نیرو)')
        LIMIT 1
      `).get(session.volunteerId);
      if (active) throw new Error('ACTIVE_ASSIGNMENT_EXISTS');

      db.prepare(`
        INSERT INTO incident_assignments (incidentId, volunteerId, active)
        VALUES (?, ?, 1)
      `).run(incidentId, session.volunteerId);
      db.prepare(`
        UPDATE incidents SET status = 'تحت کنترل همیار (اعزام نیرو)' WHERE id = ?
      `).run(incidentId);

      return { volunteer, incident };
    })();

    const latitude = Number(assignment.incident.mapLat ?? assignment.incident.lat);
    const longitude = Number(assignment.incident.mapLng ?? assignment.incident.lng);
    const locationUrl = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : 'موقعیت روی نقشه ثبت نشده است';
    const summary = String(assignment.incident.description || '').replace(/\s+/g, ' ').slice(0, 120);
    const message = `همیار گرامی ${assignment.volunteer.fullName}\nماموریت ${assignment.incident.type} را با موفقیت پذیرفتید.\nآدرس: ${assignment.incident.manualAddress || 'ثبت نشده'}\nشرح: ${summary}\nموقعیت روی نقشه:\n${locationUrl}\nکد حادثه: ${incidentId}\nلطفاً اصول ایمنی و دستورالعمل‌های اتاق فرمان را رعایت کنید.`;
    const sms = await sendNavidaaMessage(
      assignment.volunteer.phone,
      message,
      `incident-assignment-${incidentId}-${session.volunteerId}`
    );

    return NextResponse.json({
      success: true,
      assignment: { fullName: assignment.volunteer.fullName },
      smsDelivered: sms.success,
      warning: sms.success ? undefined : 'مأموریت ثبت شد، اما ارسال پیامک تأیید مأموریت ناموفق بود.'
    }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'VOLUNTEER_NOT_APPROVED') {
      return NextResponse.json({ error: 'پرونده داوطلبی شما تایید نشده است.' }, { status: 403 });
    }
    if (code === 'INCIDENT_NOT_FOUND') {
      return NextResponse.json({ error: 'حادثه یافت نشد.' }, { status: 404 });
    }
    if (code === 'INCIDENT_NOT_APPROVED') {
      return NextResponse.json({ error: 'این حادثه تاییدشده و فعال نیست.' }, { status: 409 });
    }
    if (code === 'INCIDENT_CITY_MISMATCH') {
      return NextResponse.json({ error: 'این حادثه مربوط به شهر محل سکونت شما نیست.' }, { status: 403 });
    }
    if (code === 'DUPLICATE_ASSIGNMENT') {
      return NextResponse.json({ error: 'شما قبلاً این مأموریت را پذیرفته‌اید.' }, { status: 409 });
    }
    if (code === 'ACTIVE_ASSIGNMENT_EXISTS' || (error as any)?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'شما در حال حاضر یک مأموریت فعال دارید و نمی‌توانید مأموریت دیگری را بپذیرید.' }, { status: 409 });
    }
    console.error('Create incident assignment error:', error);
    return NextResponse.json({ error: 'خطای داخلی در ثبت مأموریت' }, { status: 500 });
  }
}
