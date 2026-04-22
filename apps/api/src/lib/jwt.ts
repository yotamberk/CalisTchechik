import jwt from 'jsonwebtoken';
import type { Role } from '@calist/shared';

const SECRET = process.env.JWT_SECRET || 'dev-secret-please-change-in-production';
const COOKIE_NAME = 'calist_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface JwtPayload {
  userId: string;
  roles: Role[];
  activeRole: Role;
  impersonating?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function setCookie(res: import('express').Response, payload: JwtPayload) {
  const token = signToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
  });
  return token;
}

export function clearCookie(res: import('express').Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
}

export { COOKIE_NAME };
