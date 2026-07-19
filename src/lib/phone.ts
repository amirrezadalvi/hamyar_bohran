const PERSIAN_ARABIC_DIGITS = /[۰-۹٠-٩]/g;

export function normalizeIranianMobile(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const digits = String(value)
    .trim()
    .replace(PERSIAN_ARABIC_DIGITS, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 1776 ? code - 1776 : code - 1632);
    })
    .replace(/[^\d+]/g, '');

  let national = digits;
  if (national.startsWith('+98')) national = `0${national.slice(3)}`;
  else if (national.startsWith('0098')) national = `0${national.slice(4)}`;
  else if (national.startsWith('98')) national = `0${national.slice(2)}`;
  else if (national.startsWith('9') && national.length === 10) national = `0${national}`;

  return /^09\d{9}$/.test(national) ? national : null;
}
