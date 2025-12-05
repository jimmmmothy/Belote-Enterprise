import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string, username: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string, username?: string };
    if (!decoded.userId || !decoded.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { userId: decoded.userId, username: decoded.username };
    return next();
  } catch (err) {
    console.error('[AUTH] Invalid token', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
