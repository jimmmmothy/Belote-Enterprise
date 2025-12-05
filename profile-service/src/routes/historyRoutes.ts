import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getMatchHistoryByUserId } from '../repositories/matchHistoryRepository';

export function createHistoryRoutes() {
  const router = Router();

  router.get('/history/me', authMiddleware, async (req, res) => {
    const limitRaw = req.query.limit as string | undefined;
    const cursor = req.query.cursor as string | undefined;

    const limitNum = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
    if (Number.isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100' });
    }

    try {
      const result = await getMatchHistoryByUserId(req.user!.userId, { limit: limitNum, cursor });
      return res.json({ items: result.items, nextCursor: result.nextCursor ?? null });
    } catch (err) {
      console.error('[ERROR] Failed to fetch match history', err);
      return res.status(500).json({ error: 'Failed to fetch match history' });
    }
  });

  return router;
}
