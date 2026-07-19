import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { clearSession, parseVolunteerSkills, readSession } from '@/lib/auth';

export async function GET() {
  const session = readSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (session.role === 'senior_admin') {
    return NextResponse.json({ user: session });
  }

  const volunteer = db.prepare(`
    SELECT id, fullName, phone, nationalId, skills, job, address, status,
           rank, gender, birthDate, city
    FROM volunteers WHERE id = ? AND status = 'تایید شده' LIMIT 1
  `).get(session.volunteerId) as any;

  if (!volunteer) {
    clearSession();
    return NextResponse.json({ user: null }, { status: 401 });
  }

  volunteer.skills = parseVolunteerSkills(volunteer.skills);
  return NextResponse.json({ user: { ...session, volunteer } });
}
