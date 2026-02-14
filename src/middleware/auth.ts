import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

interface AuthRequest extends Request {
  authenticated?: boolean;
  sessionExpiry?: number;
}

// In-memory session store (1 hour TTL)
const sessions = new Map<string, { expiry: number }>();
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

export function generateSessionToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

export function createSession(): string {
  const token = generateSessionToken();
  const expiry = Date.now() + SESSION_TTL;
  sessions.set(token, { expiry });

  // Clean up expired sessions periodically
  if (Math.random() < 0.1) {
    const now = Date.now();
    for (const [key, value] of sessions.entries()) {
      if (value.expiry < now) {
        sessions.delete(key);
      }
    }
  }

  return token;
}

export function validateToken(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;

  if (session.expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }

  return true;
}

export function verifyPassword(password: string): boolean {
  return password === config.privateToken;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');

  if (token && validateToken(token)) {
    req.authenticated = true;
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized',
  });
}

export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');

  if (token && validateToken(token)) {
    req.authenticated = true;
  }

  next();
}
