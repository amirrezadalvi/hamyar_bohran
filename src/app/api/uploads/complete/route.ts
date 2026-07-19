import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readVerifiedPhone } from '@/lib/auth';
import {
  ALLOWED_VOLUNTEER_DOCUMENT_TYPES,
  deleteVolunteerDocument,
  headVolunteerDocument,
  MAX_VOLUNTEER_DOCUMENT_SIZE
} from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const applicantPhone = readVerifiedPhone('volunteer_application');
    if (!applicantPhone) {
      return NextResponse.json({ error: 'اعتبار تأیید شماره همراه پایان یافته است.' }, { status: 403 });
    }
    const uploadId = Number((await req.json()).uploadId);
    if (!Number.isInteger(uploadId) || uploadId <= 0) {
      return NextResponse.json({ error: 'شناسه فایل نامعتبر است.' }, { status: 400 });
    }
    const upload = db.prepare(`
      SELECT id, objectKey, originalName, contentType, size
      FROM volunteer_upload_sessions
      WHERE id = ? AND applicantPhone = ?
    `).get(uploadId, applicantPhone) as {
      id: number; objectKey: string; originalName: string; contentType: string; size: number;
    } | undefined;
    if (!upload) {
      return NextResponse.json({ error: 'فایل موردنظر پیدا نشد.' }, { status: 404 });
    }

    const remote = await headVolunteerDocument(upload.objectKey);
    const remoteSize = Number(remote.ContentLength);
    const remoteType = String(remote.ContentType || '').toLowerCase();
    if (
      remoteSize !== upload.size ||
      remoteSize <= 0 ||
      remoteSize > MAX_VOLUNTEER_DOCUMENT_SIZE ||
      remoteType !== upload.contentType ||
      !ALLOWED_VOLUNTEER_DOCUMENT_TYPES.has(remoteType)
    ) {
      await deleteVolunteerDocument(upload.objectKey).catch(() => undefined);
      db.prepare('DELETE FROM volunteer_upload_sessions WHERE id = ?').run(uploadId);
      return NextResponse.json({ error: 'مشخصات فایل آپلودشده معتبر نیست.' }, { status: 400 });
    }
    const documentId = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO volunteer_documents
          (applicantPhone, objectKey, originalName, contentType, size, status, uploadedAt)
        VALUES (?, ?, ?, ?, ?, 'uploaded', CURRENT_TIMESTAMP)
      `).run(
        applicantPhone,
        upload.objectKey,
        upload.originalName,
        upload.contentType,
        upload.size
      );
      db.prepare('DELETE FROM volunteer_upload_sessions WHERE id = ?').run(uploadId);
      return Number(result.lastInsertRowid);
    })();
    return NextResponse.json({ success: true, documentId });
  } catch {
    console.error('Unable to verify volunteer document upload');
    return NextResponse.json({ error: 'تأیید فایل آپلودشده ممکن نشد.' }, { status: 502 });
  }
}
