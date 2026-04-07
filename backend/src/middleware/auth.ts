import { NextFunction, Request, Response } from 'express';
import sessionRepository from '../db/repositories/sessionRepository.js';
import { db } from '../store.js';
import { Session, UserRole } from '../types.js';

export type AuthedRequest = Request & {
  session?: Session;
  user?: { id: string; role: UserRole; phone?: string };
};

const parseToken = (value?: string): string | undefined => {
  if (!value || !value.startsWith('Bearer ')) {
    return undefined;
  }
  return value.slice('Bearer '.length).trim();
};

export const requireAuth = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = parseToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' });
  }

  let session = db.sessions.get(token);
  if (sessionRepository.isEnabled()) {
    const persisted = await sessionRepository.findByAccessToken(token);
    if (persisted) {
      session = persisted;
    }
  }

  if (!session) {
    return res.status(401).json({ message: 'Invalid auth token' });
  }
  req.session = session;
  req.user = { id: session.userId, role: session.role, phone: session.phone };
  return next();
};

export const requireRole =
  (roles: UserRole[]) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.session || !roles.includes(req.session.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
