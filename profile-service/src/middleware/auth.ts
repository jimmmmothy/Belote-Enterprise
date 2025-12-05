import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string };
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    if (!decoded.userId) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { userId: decoded.userId };
    return next();
  } catch (err) {
    console.error('[AUTH] Invalid token', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
