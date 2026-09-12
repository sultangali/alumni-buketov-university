import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { StaffUser } from '../models/StaffUser';
import { isValidObjectId } from 'mongoose';

export interface AuthUser {
  sub: string;
  username: string;
  role: 'admin' | 'moderator';
  fac?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'missing token' });
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    if (!isValidObjectId(payload.sub)) return res.status(401).json({ error: 'invalid token' });
    const user = await StaffUser.findById(payload.sub);
    if (!user || user.status === 'suspended' || (payload as AuthUser & { tokenVersion?: number }).tokenVersion !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'session expired' });
    }
    req.user = { sub: String(user._id), username: user.username, role: user.role, fac: user.fac ?? undefined };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

export function requireRole(role: 'admin' | 'moderator') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}
