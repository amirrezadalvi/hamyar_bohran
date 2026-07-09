import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM volunteers');
    const rows = stmt.all() as any[];
    
    // تبدیل امن رشته متنی مهارت‌ها به آرایه با مدیریت خطای کرش
    const volunteers = rows.map(row => {
      let parsedSkills: string[] = [];
      if (row.skills) {
        try {
          // اگر متن ساختار JSON داشت (مثل آرایه متنی تبدیل شده)
          if (row.skills.trim().startsWith('[') || row.skills.trim().startsWith('{')) {
            parsedSkills = JSON.parse(row.skills);
          } else {
            // اگر متن خام فارسی قدیمی در دیتابیس بود، آن را در قالب یک آرایه تک‌عضوی قرار می‌دهد
            parsedSkills = [row.skills.trim()];
          }
        } catch (e) {
          parsedSkills = [row.skills.trim()];
        }
      }
      
      return {
        ...row,
        skills: parsedSkills
      };
    });
    
    return NextResponse.json(volunteers);
  } catch (error) {
    console.error('Error in GET /api/volunteers:', error);
    return NextResponse.json({ error: 'خطا در دریافت لیست داوطلبان' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stmt = db.prepare(`
      INSERT INTO volunteers (fullName, phone, nationalId, skills, job, address, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      body.fullName, 
      body.phone, 
      body.nationalId, 
      JSON.stringify(body.skills || []), // ذخیره استاندارد به صورت آرایه متنی JSON
      body.job, 
      body.address, 
      'در انتظار تایید'
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/volunteers:', error);
    return NextResponse.json({ error: 'خطا در ثبت پرونده داوطلب' }, { status: 500 });
  }
}