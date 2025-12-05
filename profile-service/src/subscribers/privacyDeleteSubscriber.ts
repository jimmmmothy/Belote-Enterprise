import type { initNats } from '../nats-client';
import { performUserDeletion } from '../services/deletionService';

type NatsClient = Awaited<ReturnType<typeof initNats>>;

export function subscribeToPrivacyDelete(nats: NatsClient) {
  nats.subscribe('privacy.user.delete', async (msg, reply) => {
    if (!reply) return;
    try {
      const { userId } = JSON.parse(msg) as { userId?: string };
      if (!userId) {
        nats.sendMessage(reply, { success: false, error: 'INVALID_REQUEST' });
        return;
      }

      await performUserDeletion(userId, nats);
      nats.sendMessage(reply, { success: true });
    } catch (err) {
      console.error('privacy.user.delete failed', err);
      nats.sendMessage(reply, { success: false, error: 'DELETE_FAILED' });
    }
  });
}
