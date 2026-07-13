import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'وضعیت جدید ارسال نشده' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE volunteers SET status = ? WHERE id = ?');
    const result = stmt.run(status, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'داوطلب یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ PATCH volunteer status error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}