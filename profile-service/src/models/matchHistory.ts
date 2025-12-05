export type MatchResult = 'WIN' | 'LOSS' | 'DRAW';

export interface MatchHistoryEntry {
  id: string;       // e.g. `${gameId}:${userId}` or a UUID
  userId: string;
  gameId: string;
  lobbyId: string;
  createdAt: string; // game end time, ISO
  result: MatchResult;
  score?: number;
  teammates: Array<{ userId: string; username: string }>;
  opponents: Array<{ userId: string; username: string }>;
  durationSeconds?: number;
}
