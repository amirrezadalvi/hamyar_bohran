import crypto from 'crypto';

const PASSWORD_PREFIX = 'scrypt';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';

export function generateTemporaryPassword(): string {
  const characters = [
    ...Array.from({ length: 3 }, () => LETTERS[crypto.randomInt(LETTERS.length)]),
    ...Array.from({ length: 3 }, () => DIGITS[crypto.randomInt(DIGITS.length)]),
  ];

  for (let index = characters.length - 1; index > 0; index--) {
    const target = crypto.randomInt(index + 1);
    [characters[index], characters[target]] = [characters[target], characters[index]];
  }
  return characters.join('');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${PASSWORD_PREFIX}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export function isPasswordHash(value: string): boolean {
  return value.startsWith(`${PASSWORD_PREFIX}$`);
}

export function verifyPassword(password: string, storedValue: string): boolean {
  if (!isPasswordHash(storedValue)) return false;
  const [, saltValue, hashValue] = storedValue.split('$');
  if (!saltValue || !hashValue) return false;

  try {
    const expected = Buffer.from(hashValue, 'base64url');
    const actual = crypto.scryptSync(password, Buffer.from(saltValue, 'base64url'), expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function validateNewPassword(password: string): string | null {
  if (password.length < 6) return 'گذرواژه جدید باید حداقل ۶ کاراکتر داشته باشد.';
  const englishLetters = password.match(/[A-Za-z]/g)?.length || 0;
  const englishDigits = password.match(/[0-9]/g)?.length || 0;
  if (englishLetters < 2) return 'گذرواژه جدید باید حداقل ۲ حرف انگلیسی داشته باشد.';
  if (englishDigits < 2) return 'گذرواژه جدید باید حداقل ۲ رقم انگلیسی داشته باشد.';
  return null;
}
