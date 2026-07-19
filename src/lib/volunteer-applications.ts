import db from './db';
import { normalizeIranianMobile } from './phone';
import { deleteVolunteerDocument } from './storage';

export type BlockingVolunteerApplication = 'approved' | 'pending';

const APPROVED_STATUSES = new Set(['تایید شده', 'تأیید شده', 'approved']);
const REJECTED_STATUSES = new Set(['رد صلاحیت شده', 'رد شده', 'rejected']);

export function classifyVolunteerStatus(status: unknown): 'approved' | 'rejected' | 'pending' {
  const normalized = String(status || '').trim().toLowerCase();
  if (APPROVED_STATUSES.has(normalized)) return 'approved';
  if (REJECTED_STATUSES.has(normalized)) return 'rejected';
  return 'pending';
}

export function findBlockingVolunteerApplication(
  normalizedPhone: string
): BlockingVolunteerApplication | null {
  const matches = (db.prepare('SELECT phone, status FROM volunteers').all() as {
    phone: string; status: string;
  }[]).filter(row => normalizeIranianMobile(row.phone) === normalizedPhone);

  if (matches.some(row => classifyVolunteerStatus(row.status) === 'approved')) return 'approved';
  if (matches.some(row => classifyVolunteerStatus(row.status) === 'pending')) return 'pending';
  return null;
}

export function duplicateVolunteerMessage(blocking: BlockingVolunteerApplication): string {
  return blocking === 'approved'
    ? 'شما قبلاً بهعنوان داوطلب تأیید شدهاید و امکان ثبت درخواست مجدد با این شماره همراه وجود ندارد.'
    : 'درخواست داوطلبی شما قبلاً ثبت شده و هنوز در حال بررسی است.';
}

export async function cleanupUnattachedVolunteerUploads(normalizedPhone: string): Promise<void> {
  const documents = (db.prepare(`
    SELECT id, applicantPhone, objectKey
    FROM volunteer_documents
    WHERE volunteerId IS NULL
  `).all() as { id: number; applicantPhone: string; objectKey: string }[])
    .filter(row => normalizeIranianMobile(row.applicantPhone) === normalizedPhone);
  const sessions = (db.prepare(`
    SELECT id, applicantPhone, objectKey
    FROM volunteer_upload_sessions
  `).all() as { id: number; applicantPhone: string; objectKey: string }[])
    .filter(row => normalizeIranianMobile(row.applicantPhone) === normalizedPhone);

  const documentIds: number[] = [];
  const sessionIds: number[] = [];
  await Promise.all([
    ...documents.map(async document => {
      try {
        await deleteVolunteerDocument(document.objectKey);
        documentIds.push(document.id);
      } catch {}
    }),
    ...sessions.map(async session => {
      try {
        await deleteVolunteerDocument(session.objectKey);
        sessionIds.push(session.id);
      } catch {}
    })
  ]);

  db.transaction(() => {
    const deleteDocument = db.prepare(
      'DELETE FROM volunteer_documents WHERE id = ? AND volunteerId IS NULL'
    );
    const deleteSession = db.prepare('DELETE FROM volunteer_upload_sessions WHERE id = ?');
    for (const id of documentIds) deleteDocument.run(id);
    for (const id of sessionIds) deleteSession.run(id);
  })();
}
