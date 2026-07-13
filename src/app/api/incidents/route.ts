import db from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    console.log("🚨 Received new incident report:", body.type);

    const stmt = db.prepare(`
      INSERT INTO incidents (
        id, type, severityValue, description, reporterName, reporterPhone,
        lat, lng, status, likes, dislikes, assignedHamyars,
        manualAddress, mapLat, mapLng, city
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      body.status || 'در دست بررسی',
      body.likes || 0,
      body.dislikes || 0,
      JSON.stringify(body.assignedHamyars || []),
      body.manualAddress || '',
      body.mapLat || body.lat,
      body.mapLng || body.lng,
      body.city || ''
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST Incident Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}