import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';
import { deleteVolunteerDocument } from '@/lib/storage';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'شناسه فایل نامعتبر است.' }, { status: 400 });
    }
    const session = readSession();
    if (session?.role !== 'senior_admin') {
      return NextResponse.json({ error: 'اجازه حذف این فایل را ندارید.' }, { status: 403 });
    }
    const document = db.prepare(`
      SELECT id, objectKey, applicantPhone, volunteerId
      FROM volunteer_documents WHERE id = ?
    `).get(id) as {
      id: number; objectKey: string; applicantPhone: string; volunteerId: number | null;
    } | undefined;
    if (!document) {
      return NextResponse.json({ error: 'فایل پیدا نشد.' }, { status: 404 });
    }
    await deleteVolunteerDocument(document.objectKey);
    db.prepare('DELETE FROM volunteer_documents WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'حذف فایل ممکن نشد.' }, { status: 502 });
  }
}
