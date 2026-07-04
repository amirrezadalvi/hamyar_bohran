// src/app/api/incidents/route.ts
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ایجاد جدول حوادث در صورت عدم وجود
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY,
    type TEXT,
    severityValue INTEGER,
    description TEXT,
    reporterName TEXT,
    reporterPhone TEXT,
    lat REAL,
    lng REAL,
    status TEXT,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    assignedHamyars TEXT DEFAULT '[]'
  );
`);

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM incidents ORDER BY id DESC');
    const rows = stmt.all() as any[];
    
    const incidents = rows.map(row => ({
      ...row,
      assignedHamyars: JSON.parse(row.assignedHamyars || '[]')
    }));
    
    return NextResponse.json(incidents);
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stmt = db.prepare(`
      INSERT INTO incidents (id, type, severityValue, description, reporterName, reporterPhone, lat, lng, status, likes, dislikes, assignedHamyars)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      body.id,
      body.type,
      body.severityValue,
      body.description,
      body.reporterName,
      body.reporterPhone,
      body.lat,
      body.lng,
      body.status,
      body.likes || 0,
      body.dislikes || 0,
      JSON.stringify(body.assignedHamyars || [])
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}