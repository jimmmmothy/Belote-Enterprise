import { ProfileDocument } from '../types/profile.js';

export interface NatsClient {
  request: (topic: string, data: any, timeout?: number) => Promise<any>;
  sendMessage: (topic: string, data: any) => void;
}

let natsClient: NatsClient | null = null;

export function setProfileNatsClient(client: NatsClient) {
  natsClient = client;
}

function requireNats(): NatsClient {
  if (!natsClient) throw new Error('NATS client not initialized for profile service');
  return natsClient;
}

export async function getOrCreateProfile(userId: string, username?: string): Promise<ProfileDocument> {
  const nats = requireNats();
  const existing = await nats.request('profile.get', { userId });

  if (existing?.profile) return existing.profile as ProfileDocument;

  const now = new Date().toISOString();
  const defaultProfile: ProfileDocument = {
    id: userId,
    userId,
    username: username || `User-${userId.slice(0, 6)}`,
    createdAt: now,
    updatedAt: now,
    showInLeaderboards: true,
    showPublicMatchHistory: true,
    marketingEmailsOptIn: false,
    deletionRequestedAt: null,
    hardDeletedAt: null
  };

  const created = await nats.request('profile.create', defaultProfile);
  if (!created?.profile) throw new Error('Failed to create default profile');
  return created.profile as ProfileDocument;
}

const allowedFields = new Set<keyof ProfileDocument>([
  'username',
  'avatarUrl',
  'showInLeaderboards',
  'showPublicMatchHistory',
  'marketingEmailsOptIn'
]);

export async function updateProfileForUser(
  userId: string,
  partial: Partial<ProfileDocument>
): Promise<ProfileDocument> {
  const nats = requireNats();
  const existing = await getOrCreateProfile(userId);

  const filtered = Object.entries(partial).reduce<Partial<ProfileDocument>>((acc, [key, value]) => {
    if (allowedFields.has(key as keyof ProfileDocument)) {
      acc[key as keyof ProfileDocument] = value as any;
    }
    return acc;
  }, {});

  const updated: ProfileDocument = {
    ...existing,
    ...filtered,
    userId,
    id: existing.id,
    updatedAt: new Date().toISOString()
  };

  const saved = await nats.request('profile.update', updated);
  if (!saved?.profile) throw new Error('Failed to update profile');
  return saved.profile as ProfileDocument;
}
