export interface ProfileDocument {
  id: string;           // same as userId
  userId: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;    // ISO
  updatedAt: string;    // ISO
  showInLeaderboards: boolean;
  showPublicMatchHistory: boolean;
  marketingEmailsOptIn: boolean;
  deletionRequestedAt?: string | null;
  hardDeletedAt?: string | null;
}
