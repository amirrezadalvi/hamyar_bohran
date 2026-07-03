// src/app/api/volunteers/route.ts
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const stmt = db.prepare('SELECT * FROM volunteers');
  const volunteers = stmt.all();
  return NextResponse.json(volunteers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const stmt = db.prepare(`
    INSERT INTO volunteers (fullName, phone, nationalId, skills, job, address, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(body.fullName, body.phone, body.nationalId, body.skills, body.job, body.address, 'در انتظار تایید');
  return NextResponse.json({ success: true });
}