import type { initNats } from '../nats-client';
import { getProfileByUserId } from '../repositories/profileRepository';
import { getMatchHistoryByUserId } from '../repositories/matchHistoryRepository';
import { UserExportPayload } from '../types/export';

const MAX_EXPORT_ENTRIES = 1000;

type NatsClient = Awaited<ReturnType<typeof initNats>>;

export function subscribeToPrivacyExport(nats: NatsClient) {
  nats.subscribe('profile.privacy.export', async (msg, reply) => {
    if (!reply) return;
    try {
      const { userId } = JSON.parse(msg) as { userId?: string };
      if (!userId) {
        nats.sendMessage(reply, { error: 'INVALID_REQUEST' });
        return;
      }

      const [profile, historyResult, authInfo] = await Promise.all([
        getProfileByUserId(userId),
        getMatchHistoryByUserId(userId, { limit: MAX_EXPORT_ENTRIES }),
        nats.request('auth.user.getPublicInfo', { userId })
      ]);

      const payload: UserExportPayload = {
        userId,
        generatedAt: new Date().toISOString(),
        auth: !authInfo || (authInfo as any).error
          ? undefined
          : {
              email: authInfo.email,
              createdAt: authInfo.createdAt
            },
        profile: profile || undefined,
        matchHistory: historyResult.items
      };

      nats.sendMessage(reply, { data: payload });
    } catch (err) {
      console.error('profile.privacy.export failed', err);
      nats.sendMessage(reply, { error: 'EXPORT_FAILED' });
    }
  });
}
