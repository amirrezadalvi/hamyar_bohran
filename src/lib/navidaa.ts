import crypto from 'crypto';

const NAVIDAA_API_KEY = process.env.NAVIDAA_API_KEY;
const NAVIDAA_BASE_URL = "https://api.navidaa.ir";

function createMessageIdempotencyKey(): string {
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `msg-${Math.floor(Date.now() / 1000)}-${randomHex}`;
}

export async function sendNavidaaMessage(phone: string, messageText: string, idempotencyKey?: string) {
  if (process.env.SMS_DISABLED === 'true') {
    return { success: true, disabled: true };
  }
  if (!NAVIDAA_API_KEY) {
    return { success: false, error: 'Navidaa API key is not configured' };
  }
  const url = `${NAVIDAA_BASE_URL}/v1/messages/send`;
  
  const payload = {
    phone: phone.trim(),
    message: messageText.trim(),
    channels: [
      { channel: "sms" },
      { channel: "bale" }
    ],
    strategy: "broadcast"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': NAVIDAA_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey || createMessageIdempotencyKey()
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201) {
      const data = await response.json();
      console.log('✅ Navidaa message accepted by provider');
      return { success: true, data };
    }
    
    await response.text();
    console.error('🔴 Navidaa provider rejected message:', response.status);
    return { success: false, error: `Navidaa error ${response.status}` };
  } catch (error: any) {
    console.error("🔴 Navidaa Fetch Error:", error.message);
    return { success: false, error: `Navidaa connection error: ${error.message}` };
  }
}
