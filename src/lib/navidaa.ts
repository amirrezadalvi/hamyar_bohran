import crypto from 'crypto';

const NAVIDAA_API_KEY = process.env.NAVIDAA_API_KEY || "navidaa_live_50fdb6c228f23956277cd71d281906243ff67a66a3d4a394914b46cc4030ea4d";
const NAVIDAA_BASE_URL = "https://api.navidaa.ir";

function createMessageIdempotencyKey(phone: string): string {
  const cleanPhone = phone.trim();
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `msg-${cleanPhone}-${Math.floor(Date.now() / 1000)}-${randomHex}`;
}

export async function sendNavidaaMessage(phone: string, messageText: string) {
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
        'Idempotency-Key': createMessageIdempotencyKey(phone)
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201) {
      const data = await response.json();
      console.log("✅ Navidaa Response:", JSON.stringify(data, null, 2));
      return { success: true, data };
    }
    
    const errorText = await response.text();
    console.error("🔴 Navidaa Error:", response.status, errorText);
    return { success: false, error: `Navidaa error ${response.status}: ${errorText}` };
  } catch (error: any) {
    console.error("🔴 Navidaa Fetch Error:", error.message);
    return { success: false, error: `Navidaa connection error: ${error.message}` };
  }
}