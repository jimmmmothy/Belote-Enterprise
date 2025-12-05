import { getApiClient } from "./client";

export interface Profile {
  userId: string;
  username: string;
  avatarUrl?: string;
  showInLeaderboards: boolean;
  showPublicMatchHistory: boolean;
  marketingEmailsOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getProfile(): Promise<Profile> {
  const client = await getApiClient();
  const res = await client.get("/api/profiles/me");
  return res.data;
}

export async function updateProfile(partial: Partial<Profile>): Promise<Profile> {
  const client = await getApiClient();
  const res = await client.patch("/api/profiles/me", partial);
  return res.data;
}

export type MatchResult = "WIN" | "LOSS" | "DRAW";

export interface MatchHistoryEntry {
  id: string;
  userId: string;
  gameId: string;
  lobbyId: string;
  createdAt: string;
  result: MatchResult;
  score?: number;
  teammates: { userId: string; username: string }[];
  opponents: { userId: string; username: string }[];
  durationSeconds?: number;
}

export async function getMatchHistory(limit = 20, cursor?: string) {
  const client = await getApiClient();
  const res = await client.get("/match-history/me", { params: { limit, cursor } });
  return res.data as { items: MatchHistoryEntry[]; nextCursor?: string };
}

export async function changeEmail(newEmail: string) {
  const client = await getApiClient();
  return client.post("/auth/me/change-email", { newEmail });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const client = await getApiClient();
  return client.post("/auth/me/change-password", { currentPassword, newPassword });
}

export async function requestDataExport() {
  const client = await getApiClient();
  const res = await client.post("/api/privacy/me/export");
  return res.data;
}

export async function requestDeleteAccount() {
  const client = await getApiClient();
  const res = await client.post("/api/privacy/me/delete-request");
  return res.data as { status: string };
}
