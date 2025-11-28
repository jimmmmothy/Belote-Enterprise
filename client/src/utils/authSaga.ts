import { loadConfig } from "../config";
import axios from "axios";

type JwtPayload = { exp?: number; username?: string; name?: string; email?: string };

export type AuthContext = {
  token: string;
  username: string;
};

type LobbySagaInput =
  | { kind: "create"; lobbyName: string }
  | { kind: "join"; lobbyId: string };

type LobbySagaResult = { lobbyId: string; playerId: string };

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function getUsernameFromPayload(payload: JwtPayload | null): string | null {
  if (!payload) return null;
  return (payload.username || payload.name || payload.email || "").trim() || null;
}

export function persistAuthFromToken(token: string) {
  const payload = decodeJwtPayload(token);
  const username = getUsernameFromPayload(payload);
  if (username) localStorage.setItem("username", username);
}

export function ensureAuthenticatedUser(): AuthContext {
  const token = localStorage.getItem("token");
  const cachedUsername = localStorage.getItem("username");
  const payload = token ? decodeJwtPayload(token) : null;

  const exp = payload?.exp ? payload.exp * 1000 : null;
  if (!token || (exp && Date.now() >= exp)) {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    throw new Error("UNAUTHENTICATED");
  }

  const username = getUsernameFromPayload(payload) || cachedUsername;
  if (!username) throw new Error("USERNAME_MISSING");

  localStorage.setItem("username", username);
  return { token, username };
}

export async function runLobbySaga(input: LobbySagaInput): Promise<LobbySagaResult> {
  const { token, username } = ensureAuthenticatedUser();
  const SERVER_URL = await loadConfig().then((config) => config?.serverUrl || "");

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  // Saga: ensure auth context, then invoke the appropriate lobby endpoint with the verified username.
  if (input.kind === "create") {
    const res = await axios.post(
      `${SERVER_URL}/lobbies`,
      { lobbyName: input.lobbyName, playerName: username },
      { headers }
    );
    return { lobbyId: res.data.lobbyId, playerId: res.data.playerId };
  }

  const res = await axios.post(
    `${SERVER_URL}/lobbies/${input.lobbyId}/join`,
    { playerName: username },
    { headers }
  );
  if (res.data.error) throw new Error(res.data.error);
  return { lobbyId: input.lobbyId, playerId: res.data.playerId };
}
