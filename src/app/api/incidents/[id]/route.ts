import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { readSession } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (readSession()?.role !== 'senior_admin') {
      return NextResponse.json({ error: 'فقط مدیر ارشد اجازه حذف گزارش را دارد.' }, { status: 403 });
    }
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    const result = db.transaction(() => {
      db.prepare('DELETE FROM incident_assignments WHERE incidentId = ?').run(id);
      return db.prepare('DELETE FROM incidents WHERE id = ?').run(id);
    })();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'حادثه یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ DELETE incident error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
