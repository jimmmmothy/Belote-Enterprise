import { getProfilesContainer } from '../config/cosmos';
import { deleteMatchHistoryByUserId } from '../repositories/matchHistoryRepository';
import type { initNats } from '../nats-client';

const MAX_RETRIES = 3;

async function deleteProfile(userId: string): Promise<void> {
  const container = await getProfilesContainer();
  await container.item(userId, userId).delete().catch((err) => {
    console.error('[ERROR] Failed to delete profile document', err);
  });
}

type NatsClient = Awaited<ReturnType<typeof initNats>>;

export async function performUserDeletion(userId: string, nats: NatsClient): Promise<void> {
  await deleteProfile(userId);
  await deleteMatchHistoryByUserId(userId);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await nats.request('auth.user.delete', { userId }, 3000);
      if (result?.success) return;
      console.error('[ERROR] auth.user.delete returned error', result?.error);
    } catch (err) {
      console.error('[ERROR] auth.user.delete request failed', err);
    }
  }
}
