import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let record = db.prepare('SELECT * FROM analytics WHERE id = 1').get();
    
    if (!record) {
      db.prepare(`
        INSERT INTO analytics (id, totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
        VALUES (1, 0, 0, 0, 0, '')
      `).run();
      record = db.prepare('SELECT * FROM analytics WHERE id = 1').get();
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
    
    const existing = db.prepare('SELECT * FROM analytics WHERE id = 1').get();
    
    if (!existing) {
      db.prepare(`
        INSERT INTO analytics (id, totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime)
        VALUES (1, ?, ?, ?, ?, ?)
      `).run(totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime);
    } else {
      db.prepare(`
        UPDATE analytics
        SET totalVisVisits = ?,
            uniqueUsers = ?,
            mobileHits = ?,
            desktopHits = ?,
            lastActiveTime = ?
        WHERE id = 1
      `).run(totalVisVisits, uniqueUsers, mobileHits, desktopHits, lastActiveTime);
    }
    
    const updated = db.prepare('SELECT * FROM analytics WHERE id = 1').get();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in POST /api/analytics:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
