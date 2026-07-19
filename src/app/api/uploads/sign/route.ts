import crypto from 'crypto';
import path from 'path';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readVerifiedPhone } from '@/lib/auth';
import {
  createVolunteerDocumentUploadUrl,
  MAX_VOLUNTEER_DOCUMENT_SIZE,
  MAX_VOLUNTEER_DOCUMENT_SIZE_MB,
  validateVolunteerDocument
} from '@/lib/storage';
import {
  cleanupUnattachedVolunteerUploads,
  duplicateVolunteerMessage,
  findBlockingVolunteerApplication
} from '@/lib/volunteer-applications';
import { normalizeIranianMobile } from '@/lib/phone';

export async function GET() {
  return NextResponse.json({
    maxSize: MAX_VOLUNTEER_DOCUMENT_SIZE,
    maxSizeMb: MAX_VOLUNTEER_DOCUMENT_SIZE_MB,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png']
  });
}

export async function POST(req: Request) {
  try {
    const applicantPhone = readVerifiedPhone('volunteer_application');
    const normalizedPhone = normalizeIranianMobile(applicantPhone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'ابتدا شماره همراه خود را تأیید کنید.' }, { status: 403 });
    }
    const blocking = findBlockingVolunteerApplication(normalizedPhone);
    if (blocking) {
      await cleanupUnattachedVolunteerUploads(normalizedPhone);
      return NextResponse.json({ error: duplicateVolunteerMessage(blocking) }, { status: 409 });
    }
    const body = await req.json();
    const originalName = String(body.name || '').trim();
    const contentType = String(body.contentType || '').trim().toLowerCase();
    const size = Number(body.size);
    const validationError = validateVolunteerDocument(originalName, contentType, size);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const extension = path.extname(originalName).toLowerCase();
    const objectKey = `volunteer-documents/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;
    const result = db.prepare(`
      INSERT INTO volunteer_upload_sessions
        (applicantPhone, objectKey, originalName, contentType, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(normalizedPhone, objectKey, originalName.slice(0, 255), contentType, size);
    try {
      const uploadUrl = await createVolunteerDocumentUploadUrl(objectKey, contentType);
      return NextResponse.json({
        uploadId: Number(result.lastInsertRowid),
        uploadUrl,
        expiresIn: 300
      });
    } catch (error) {
      db.prepare('DELETE FROM volunteer_upload_sessions WHERE id = ?').run(result.lastInsertRowid);
      throw error;
    }
  } catch (error) {
    console.error('Unable to prepare volunteer document upload');
    return NextResponse.json({ error: 'آماده‌سازی آپلود فایل ممکن نشد.' }, { status: 500 });
  }
}
