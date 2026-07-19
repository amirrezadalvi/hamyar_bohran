import crypto from 'crypto';
import { cookies } from 'next/headers';

export type UserRole = 'senior_admin' | 'approved_volunteer';

export interface SessionUser {
  role: UserRole;
  volunteerId?: number;
  fullName: string;
  phone: string;
  expiresAt: number;
}

const SESSION_COOKIE = 'hamyar_session';
const VERIFIED_PHONE_COOKIE = 'hamyar_verified_phone';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export const ADMIN_PHONE = process.env.ADMIN_PHONE || '09912201633';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 'scrypt$KeuDrT_3pvyxnJnRLnvgFA$rmROR6-4um0NcKsNHg2IBOlHLCvWmfW8wNUUsfPi3tc3DV--NPPJ249VRcEx6VF4NGIc4Uo8KPwGS29g6mWkrw';

export function parseVolunteerSkills(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.map(String) : [String(value)];
  } catch {
    return [String(value)];
  }
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return 'hamyar-local-development-session-secret';
  throw new Error('SESSION_SECRET is required in production');
}

function sign(payload: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function encodeSession(session: SessionUser) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function encodeSignedValue(value: object) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSignedValue<T>(token: string): T | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

interface OtpBinding {
  providerId: string;
  phone: string;
  purpose: 'login' | 'incident_report' | 'volunteer_application';
  expiresAt: number;
}

export function createOtpBinding(providerId: string, phone: string, purpose: OtpBinding['purpose']) {
  return encodeSignedValue({ providerId, phone, purpose, expiresAt: Date.now() + 10 * 60 * 1000 });
}

export function readOtpBinding(token: string): OtpBinding | null {
  const binding = decodeSignedValue<OtpBinding>(token);
  return binding && binding.expiresAt > Date.now() ? binding : null;
}

export function setVerifiedPhone(phone: string, purpose: 'incident_report' | 'volunteer_application') {
  cookies().set(VERIFIED_PHONE_COOKIE, encodeSignedValue({ phone, purpose, expiresAt: Date.now() + 10 * 60 * 1000 }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
  });
}

export function readVerifiedPhone(purpose: 'incident_report' | 'volunteer_application'): string | null {
  const token = cookies().get(VERIFIED_PHONE_COOKIE)?.value;
  if (!token) return null;
  const value = decodeSignedValue<{ phone: string; purpose: string; expiresAt: number }>(token);
  return value && value.purpose === purpose && value.expiresAt > Date.now() ? value.phone : null;
}

export function clearVerifiedPhone() {
  cookies().set(VERIFIED_PHONE_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export function readSession(): SessionUser | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser;
    if (session.expiresAt <= Date.now()) return null;
    if (session.role === 'approved_volunteer' && !session.volunteerId) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSession(user: Omit<SessionUser, 'expiresAt'>) {
  const session = { ...user, expiresAt: Date.now() + SESSION_MAX_AGE * 1000 };
  cookies().set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSession() {
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}
