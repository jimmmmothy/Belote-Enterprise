import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { UserExportPayload } from '../types/export.js';
import type { NatsClient } from '../types/nats.js';

export function createPrivacyRoutes(nats: NatsClient) {
  const router = Router();

  router.post('/privacy/me/export', authMiddleware, async (req, res) => {
    const userId = req.user!.userId;
    try {
      const response = await nats.request('profile.privacy.export', { userId });
      if (!response || response.error) {
        return res.status(500).json({ error: 'EXPORT_FAILED' });
      }

      return res.status(200).json(response.data as UserExportPayload);
    } catch (err) {
      console.error('privacy export failed', err);
      return res.status(500).json({ error: 'EXPORT_FAILED' });
    }
  });

  router.post('/privacy/me/delete-request', authMiddleware, async (req, res) => {
    const userId = req.user!.userId;
    try {
      const response = await nats.request('privacy.user.delete', { userId });
      if (!response || !response.success) {
        return res.status(500).json({ error: 'DELETE_FAILED' });
      }

      return res.status(200).json({ status: 'DELETED' });
    } catch (err) {
      console.error('privacy delete failed', err);
      return res.status(500).json({ error: 'DELETE_FAILED' });
    }
  });

  return router;
}
