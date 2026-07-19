import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { clearVerifiedPhone, readSession, readVerifiedPhone } from '@/lib/auth';
import { normalizeCity } from '@/lib/cities';
import { normalizeIranianMobile } from '@/lib/phone';
import {
  cleanupUnattachedVolunteerUploads,
  duplicateVolunteerMessage,
  findBlockingVolunteerApplication,
  type BlockingVolunteerApplication
} from '@/lib/volunteer-applications';

class DuplicateVolunteerApplicationError extends Error {
  constructor(public readonly blocking: BlockingVolunteerApplication) {
    super('Duplicate volunteer application');
  }
}

export async function GET() {
  try {
    if (readSession()?.role !== 'senior_admin') {
      return NextResponse.json({ error: 'دسترسی به پرونده‌های داوطلبان فقط برای مدیر ارشد مجاز است.' }, { status: 403 });
    }
    const stmt = db.prepare('SELECT * FROM volunteers');
    const rows = stmt.all() as any[];
    const documents = db.prepare(`
      SELECT id, volunteerId, originalName, contentType, size, uploadedAt
      FROM volunteer_documents
      WHERE volunteerId IS NOT NULL AND status = 'uploaded'
      ORDER BY id DESC
    `).all() as any[];
    const documentsByVolunteer = new Map<number, any[]>();
    for (const document of documents) {
      const current = documentsByVolunteer.get(document.volunteerId) || [];
      current.push({
        id: document.id,
        originalName: document.originalName,
        contentType: document.contentType,
        size: document.size,
        uploadedAt: document.uploadedAt
      });
      documentsByVolunteer.set(document.volunteerId, current);
    }
    
    const volunteers = rows.map(row => {
      let parsedSkills: string[] = [];
      if (row.skills) {
        try {
          if (row.skills.trim().startsWith('[') || row.skills.trim().startsWith('{')) {
            parsedSkills = JSON.parse(row.skills);
          } else {
            parsedSkills = [row.skills.trim()];
          }
        } catch (e) {
          parsedSkills = [row.skills.trim()];
        }
      }
      
      return {
        ...row,
        skills: parsedSkills,
        documents: documentsByVolunteer.get(row.id) || [],
        fixedPassword: undefined
      };
    });
    
    return NextResponse.json(volunteers);
  } catch (error) {
    console.error('Error in GET /api/volunteers:', error);
    return NextResponse.json({ error: 'خطا در دریافت لیست داوطلبان' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizeIranianMobile(body.phone);
    const city = normalizeCity(body.city);
    const verifiedPhone = normalizeIranianMobile(readVerifiedPhone('volunteer_application'));
    if (!phone || verifiedPhone !== phone) {
      return NextResponse.json({ error: 'شماره همراه داوطلب تأیید نشده است.' }, { status: 403 });
    }
    if (!city) {
      return NextResponse.json({ error: 'لطفاً شهر محل سکونت را از فهرست شهرهای ایران انتخاب کنید.' }, { status: 400 });
    }
    const createVolunteer = db.transaction(() => {
      const blocking = findBlockingVolunteerApplication(phone);
      if (blocking) throw new DuplicateVolunteerApplicationError(blocking);
      const result = db.prepare(`
        INSERT INTO volunteers (fullName, phone, nationalId, skills, job, address, status, gender, birthDate, city)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        body.fullName,
        phone,
        body.nationalId,
        JSON.stringify(body.skills || []),
        body.job,
        body.address,
        'در انتظار تایید',
        body.gender || '',
        body.birthDate || '',
        city
      );
      db.prepare(`
        UPDATE volunteer_documents
        SET volunteerId = ?
        WHERE applicantPhone = ? AND volunteerId IS NULL AND status = 'uploaded'
      `).run(result.lastInsertRowid, phone);
      return result;
    });
    let result;
    try {
      result = createVolunteer.immediate();
    } catch (error) {
      if (error instanceof DuplicateVolunteerApplicationError) {
        await cleanupUnattachedVolunteerUploads(phone);
        return NextResponse.json(
          { error: duplicateVolunteerMessage(error.blocking) },
          { status: 409 }
        );
      }
      throw error;
    }
    clearVerifiedPhone();
    
    // 🟢 بازگرداندن success به همراه id عددی و معتبر دیتابیس SQLite
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error in POST /api/volunteers:', error);
    return NextResponse.json({ error: 'خطا در ثبت پرونده داوطلب' }, { status: 500 });
  }
}
