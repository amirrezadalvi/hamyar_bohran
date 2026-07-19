import db from './db';
import { normalizeMatchableCity } from './cities';
import { sendNavidaaMessage } from './navidaa';

export async function notifyApprovedVolunteersForIncident(
  incidentId: number,
  incidentCity: unknown
) {
  const city = normalizeMatchableCity(incidentCity);
  if (!city) return { attempted: 0, failed: 0 };

  const volunteers = db.prepare(`
    SELECT MAX(fullName) AS fullName, TRIM(phone) AS phone
    FROM volunteers
    WHERE status = 'تایید شده'
      AND city = ?
      AND TRIM(phone) GLOB '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
    GROUP BY TRIM(phone)
  `).all(city) as { fullName: string; phone: string }[];

  const results = await Promise.all(volunteers.map(async volunteer => {
    const recipientKey = `phone:${volunteer.phone}`;
    const claimed = db.prepare(`
      INSERT OR IGNORE INTO incident_sms_notifications
        (incidentId, recipientKey, notificationType, status)
      VALUES (?, ?, 'same_city_volunteer', 'pending')
    `).run(incidentId, recipientKey);
    if (claimed.changes === 0) return { success: true, skipped: true };

    const message = `همیار گرامی
حادثه جدیدی در شهر شما ثبت شده است.
جهت مشاهده جزئیات حادثه به پنل کاربری خود در سامانه همیار بحران مراجعه کنید.`;
    const result = await sendNavidaaMessage(
      volunteer.phone,
      message,
      `same_city_volunteer-${incidentId}-${recipientKey}`
    );
    db.prepare(`
      UPDATE incident_sms_notifications
      SET status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE incidentId = ? AND recipientKey = ? AND notificationType = 'same_city_volunteer'
    `).run(result.success ? 'sent' : 'failed', incidentId, recipientKey);
    return result;
  }));

  return {
    attempted: volunteers.length,
    failed: results.filter(result => !result.success).length
  };
}
