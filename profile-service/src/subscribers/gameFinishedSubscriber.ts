import type { initNats } from '../nats-client';
import { insertMatchHistoryEntries } from '../repositories/matchHistoryRepository';
import { MatchHistoryEntry } from '../models/matchHistory';
import { getProfileByUserId } from '../repositories/profileRepository';

type NatsClient = Awaited<ReturnType<typeof initNats>>;

interface GameFinishedEvent {
  type: 'game.finished';
  gameId: string;
  lobbyId: string;
  endedAt: string;
  players: Array<{
    userId: string;
    username: string;
    team: 'A' | 'B';
    result: 'WIN' | 'LOSS' | 'DRAW';
    score?: number;
  }>;
  durationSeconds?: number;
}

function parseEvent(raw: string): GameFinishedEvent | null {
  try {
    const parsed = JSON.parse(raw) as GameFinishedEvent;
    if (parsed.type !== 'game.finished') return null;
    return parsed;
  } catch (err) {
    console.error('[NATS] Failed to parse game.finished payload', err);
    return null;
  }
}

export function subscribeToGameFinished(nats: NatsClient) {
  nats.subscribe('game.finished', async (msg) => {
    const event = parseEvent(msg);
    if (!event) return;

    try {
      const usernameMap = new Map<string, string>();
      await Promise.all(
        event.players.map(async (player) => {
          try {
            const profile = await getProfileByUserId(player.userId);
            usernameMap.set(player.userId, profile?.username ?? player.username ?? player.userId);
          } catch (err) {
            console.error('[NATS] Failed to fetch profile for user', player.userId, err);
            usernameMap.set(player.userId, player.username ?? player.userId);
          }
        })
      );

      const entries: MatchHistoryEntry[] = event.players.map((player) => {
        const teammates = event.players
          .filter((p) => p.userId !== player.userId && p.team === player.team)
          .map((p) => ({ userId: p.userId, username: usernameMap.get(p.userId) ?? p.username ?? p.userId }));

        const opponents = event.players
          .filter((p) => p.team !== player.team)
          .map((p) => ({ userId: p.userId, username: usernameMap.get(p.userId) ?? p.username ?? p.userId }));

        return {
          id: `${event.gameId}:${player.userId}`,
          userId: player.userId,
          gameId: event.gameId,
          lobbyId: event.lobbyId,
          createdAt: event.endedAt,
          result: player.result,
          score: player.score,
          teammates,
          opponents,
          durationSeconds: event.durationSeconds
        };
      });

      await insertMatchHistoryEntries(entries);
      console.log(`[NATS] Stored match history for game ${event.gameId}`);
    } catch (err) {
      console.error('[NATS] Failed to store match history entries', err);
    }
  });
}
