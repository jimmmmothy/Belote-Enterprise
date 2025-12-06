import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getOrCreateProfile, setProfileNatsClient, updateProfileForUser, NatsClient } from '../services/profileService.js';
import { ProfileDocument } from '../types/profile.js';

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const MAX_AVATAR_URL_LENGTH = 500;

type UpdatePayload = Pick<ProfileDocument, 'username' | 'avatarUrl' | 'showInLeaderboards' | 'showPublicMatchHistory' | 'marketingEmailsOptIn'>;

export function createProfileRoutes(nats: NatsClient) {
  setProfileNatsClient(nats);
  const router = Router();

  router.get('/profiles/me', authMiddleware, async (req, res) => {
    try {
      const profile = await getOrCreateProfile(req.user!.userId, req.user!.username);
      return res.json(profile);
    } catch (err) {
      console.error('[ERROR] Failed to fetch profile', err);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  router.patch('/profiles/me', authMiddleware, async (req, res) => {
    const body = req.body as Partial<UpdatePayload> | undefined;
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid payload' });

    if (body.username !== undefined) {
      if (typeof body.username !== 'string' || !USERNAME_REGEX.test(body.username)) {
        return res.status(400).json({ error: 'Invalid username' });
      }
    }

    if (body.avatarUrl !== undefined) {
      if (typeof body.avatarUrl !== 'string' || body.avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
        return res.status(400).json({ error: 'Invalid avatarUrl' });
      }
    }

    for (const key of ['showInLeaderboards', 'showPublicMatchHistory', 'marketingEmailsOptIn'] as const) {
      const value = body[key];
      if (value !== undefined && typeof value !== 'boolean') {
        return res.status(400).json({ error: `Invalid ${key}` });
      }
    }

    try {
      const updated = await updateProfileForUser(req.user!.userId, body);
      return res.json(updated);
    } catch (err) {
      console.error('[ERROR] Failed to update profile', err);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  return router;
}
