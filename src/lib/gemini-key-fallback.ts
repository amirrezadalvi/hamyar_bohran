export function getConfiguredGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4
  ].filter((key): key is string => Boolean(key?.trim()));
}

export function getGeminiKeyOrder(seed: string, keys: string[]): { key: string; index: number }[] {
  let hash = 0;
  for (const character of seed) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  const startIndex = hash % keys.length;
  return keys.map((_, offset) => {
    const index = (startIndex + offset) % keys.length;
    return { key: keys[index], index };
  });
}

export function isRetryableGeminiFailure(status: number, responseText: string): boolean {
  if ([408, 429, 500, 502, 503, 504].includes(status)) return true;
  const normalized = responseText.toLowerCase();
  return (status === 403 || status === 400) && (
    normalized.includes('quota') ||
    normalized.includes('rate limit') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('temporarily unavailable')
  );
}
