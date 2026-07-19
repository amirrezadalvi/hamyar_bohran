import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM volunteers) AS registeredVolunteers,
        (SELECT COUNT(*) FROM volunteers WHERE status IN ('تایید شده', 'تأیید شده')) AS approvedVolunteers,
        (SELECT COUNT(*) FROM volunteers WHERE status IN ('رد صلاحیت شده', 'رد شده')) AS rejectedVolunteers,
        (SELECT COUNT(*) FROM incidents) AS registeredIncidents,
        (
          SELECT COUNT(*) FROM incidents
          WHERE status IN ('تایید شده', 'تأیید شده', 'تحت کنترل همیار (اعزام نیرو)')
        ) AS approvedIncidents,
        (SELECT COUNT(*) FROM incidents WHERE status IN ('رد صلاحیت شده', 'رد شده')) AS rejectedIncidents,
        (
          SELECT COUNT(DISTINCT city) FROM volunteers
          WHERE status IN ('تایید شده', 'تأیید شده')
            AND city IS NOT NULL AND TRIM(city) != ''
            AND city != 'سایر شهرهای ایران'
        ) AS coveredCities
    `).get() as {
      registeredVolunteers: number;
      approvedVolunteers: number;
      rejectedVolunteers: number;
      registeredIncidents: number;
      approvedIncidents: number;
      rejectedIncidents: number;
      coveredCities: number;
    };

    return NextResponse.json(counts, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Homepage statistics query failed:', error);
    return NextResponse.json({ error: 'دریافت آمار فعلی ممکن نیست.' }, { status: 500 });
  }
}
