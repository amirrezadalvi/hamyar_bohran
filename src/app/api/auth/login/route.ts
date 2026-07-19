import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_PHONE, parseVolunteerSkills, setSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    const ident = String(identifier || '').trim();
    const pass = String(password || '').trim();

    if (!ident || !pass) {
      return NextResponse.json({ error: 'شناسه و گذرواژه الزامی است.' }, { status: 400 });
    }

    if ((ident === ADMIN_PHONE || (ADMIN_EMAIL && ident === ADMIN_EMAIL)) && verifyPassword(pass, ADMIN_PASSWORD_HASH)) {
      const user = { role: 'senior_admin' as const, fullName: 'مدیر ارشد', phone: ADMIN_PHONE };
      setSession(user);
      return NextResponse.json({ user });
    }

    const volunteer = db.prepare(`
      SELECT id, fullName, phone, nationalId, skills, job, address, status,
             fixedPassword, rank, gender, birthDate, city
      FROM volunteers
      WHERE (phone = ? OR nationalId = ?) AND status = 'تایید شده'
      LIMIT 1
    `).get(ident, ident) as any;

    if (!volunteer) {
      return NextResponse.json({ error: 'صلاحیت شما برای ورود به پنل همیار تأیید نشده است.' }, { status: 403 });
    }
    if (!volunteer.fixedPassword || !verifyPassword(pass, volunteer.fixedPassword)) {
      return NextResponse.json({ error: 'شناسه یا گذرواژه نادرست است.' }, { status: 401 });
    }

    volunteer.skills = parseVolunteerSkills(volunteer.skills);
    delete volunteer.fixedPassword;
    setSession({ role: 'approved_volunteer', volunteerId: volunteer.id, fullName: volunteer.fullName, phone: volunteer.phone });
    return NextResponse.json({ user: { role: 'approved_volunteer', volunteer } });
  } catch (error) {
    console.error('Password login error:', error);
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 });
  }
}
