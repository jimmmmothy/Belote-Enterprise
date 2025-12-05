import dotenv from 'dotenv';
import { initNats } from './nats-client';
import { initializeCosmos } from './config/cosmos';
import { createProfile, getProfileByUserId, updateProfile } from './repositories/profileRepository';
import { getMatchHistoryByUserId, insertMatchHistoryEntries } from './repositories/matchHistoryRepository';
import { ProfileDocument } from './models/profile';
import { MatchHistoryEntry } from './models/matchHistory';
import { subscribeToGameFinished } from './subscribers/gameFinishedSubscriber';
import { subscribeToPrivacyExport } from './subscribers/privacyExportSubscriber';
import { subscribeToPrivacyDelete } from './subscribers/privacyDeleteSubscriber';

dotenv.config();

function parseJsonMessage<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('[ERROR] Failed to parse incoming message', err);
    return null;
  }
}

async function start() {
  await initializeCosmos();
  const nats = await initNats();

  nats.subscribe('profile.health', (_msg, reply) => {
    if (reply) nats.sendMessage(reply, { status: 'ok' });
  });

  nats.subscribe('profile.get', async (msg, reply) => {
    const body = parseJsonMessage<{ userId: string }>(msg);
    if (!body?.userId) {
      if (reply) nats.sendMessage(reply, { error: 'userId is required' });
      return;
    }

    try {
      const profile = await getProfileByUserId(body.userId);
      if (!reply) return;
      if (!profile) nats.sendMessage(reply, { error: 'Profile not found' });
      else nats.sendMessage(reply, { profile });
    } catch (err) {
      console.error('[ERROR] Failed to fetch profile', err);
      if (reply) nats.sendMessage(reply, { error: 'Failed to fetch profile' });
    }
  });

  nats.subscribe('profile.create', async (msg, reply) => {
    const payload = parseJsonMessage<Partial<ProfileDocument>>(msg);
    if (!payload?.userId || !payload?.username) {
      if (reply) nats.sendMessage(reply, { error: 'userId and username are required' });
      return;
    }

    const now = new Date().toISOString();
    const profile: ProfileDocument = {
      id: payload.userId,
      userId: payload.userId,
      username: payload.username,
      avatarUrl: payload.avatarUrl,
      createdAt: now,
      updatedAt: now,
      showInLeaderboards: payload.showInLeaderboards ?? true,
      showPublicMatchHistory: payload.showPublicMatchHistory ?? true,
      marketingEmailsOptIn: payload.marketingEmailsOptIn ?? false,
      deletionRequestedAt: payload.deletionRequestedAt ?? null,
      hardDeletedAt: payload.hardDeletedAt ?? null
    };

    try {
      const created = await createProfile(profile);
      if (reply) nats.sendMessage(reply, { profile: created });
    } catch (err) {
      console.error('[ERROR] Failed to create profile', err);
      if (reply) nats.sendMessage(reply, { error: 'Failed to create profile' });
    }
  });

  nats.subscribe('profile.update', async (msg, reply) => {
    const payload = parseJsonMessage<Partial<ProfileDocument> & { userId?: string }>(msg);
    const userId = payload?.userId;

    if (!userId) {
      if (reply) nats.sendMessage(reply, { error: 'userId is required' });
      return;
    }

    try {
      const existing = await getProfileByUserId(userId);
      if (!existing) {
        if (reply) nats.sendMessage(reply, { error: 'Profile not found' });
        return;
      }

      const now = new Date().toISOString();
      const updated: ProfileDocument = {
        ...existing,
        ...payload,
        id: existing.id,
        userId,
        updatedAt: now
      };

      const saved = await updateProfile(updated);
      if (reply) nats.sendMessage(reply, { profile: saved });
    } catch (err) {
      console.error('[ERROR] Failed to update profile', err);
      if (reply) nats.sendMessage(reply, { error: 'Failed to update profile' });
    }
  });

  nats.subscribe('match-history.insert', async (msg, reply) => {
    const entries = parseJsonMessage<MatchHistoryEntry[]>(msg);
    if (!Array.isArray(entries)) {
      if (reply) nats.sendMessage(reply, { error: 'Expected an array of match history entries' });
      return;
    }

    try {
      await insertMatchHistoryEntries(entries);
      if (reply) nats.sendMessage(reply, { success: true, inserted: entries.length });
    } catch (err) {
      console.error('[ERROR] Failed to insert match history entries', err);
      if (reply) nats.sendMessage(reply, { error: 'Failed to insert match history entries' });
    }
  });

  nats.subscribe('match-history.get', async (msg, reply) => {
    const body = parseJsonMessage<{ userId: string; limit?: number; cursor?: string }>(msg);
    if (!body?.userId) {
      if (reply) nats.sendMessage(reply, { error: 'userId is required' });
      return;
    }

    const limit = body.limit && body.limit > 0 ? body.limit : 20;
    const cursor = body.cursor;

    try {
      const result = await getMatchHistoryByUserId(body.userId, { limit, cursor });
      if (reply) nats.sendMessage(reply, result);
    } catch (err) {
      console.error('[ERROR] Failed to fetch match history', err);
      if (reply) nats.sendMessage(reply, { error: 'Failed to fetch match history' });
    }
  });

  subscribeToGameFinished(nats);
  subscribeToPrivacyExport(nats);
  subscribeToPrivacyDelete(nats);
}

start().catch((err) => {
  console.error('[FATAL] profile-service failed to start', err);
  process.exit(1);
});
