import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';
import { createVolunteerDocumentDownloadUrl } from '@/lib/storage';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    if (readSession()?.role !== 'senior_admin') {
      return NextResponse.json({ error: 'مشاهده مدارک فقط برای مدیر ارشد مجاز است.' }, { status: 403 });
    }
    const id = Number(params.id);
    const document = Number.isInteger(id)
      ? db.prepare(`
          SELECT objectKey FROM volunteer_documents
          WHERE id = ? AND volunteerId IS NOT NULL AND status = 'uploaded'
        `).get(id) as { objectKey: string } | undefined
      : undefined;
    if (!document) {
      return NextResponse.json({ error: 'فایل پیدا نشد.' }, { status: 404 });
    }
    return NextResponse.json({ url: await createVolunteerDocumentDownloadUrl(document.objectKey) });
  } catch {
    return NextResponse.json({ error: 'دریافت لینک مشاهده فایل ممکن نشد.' }, { status: 502 });
  }
}
