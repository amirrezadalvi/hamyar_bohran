import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 });
    }

    const stmt = db.prepare('DELETE FROM incidents WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'حادثه یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ DELETE incident error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}