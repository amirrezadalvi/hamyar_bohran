import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let record = db.prepare('SELECT * FROM analytics LIMIT 1').get() as any;
    
    if (!record) {
      db.prepare(`
        INSERT INTO analytics (totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
        VALUES (0, 0, 0, 0, '')
      `).run();
      record = db.prepare('SELECT * FROM analytics LIMIT 1').get();
    }
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error in GET /api/analytics:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime } = body;
    
    const existing = db.prepare('SELECT * FROM analytics LIMIT 1').get() as any;
    
    if (!existing) {
      db.prepare(`
        INSERT INTO analytics (totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
        VALUES (?, ?, ?, ?, ?)
      `).run(totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime);
    } else {
      db.prepare(`
        UPDATE analytics
        SET totalVisVisits = ?,
            uniqueUsers = ?,
            mobileHits = ?,
            desktopHits = ?,
            lastActiveTime = ?
        WHERE id = ?
      `).run(totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime, existing.id);
    }
    
    const updated = db.prepare('SELECT * FROM analytics LIMIT 1').get();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in POST /api/analytics:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}