import { loadConfig } from "../config";
import axios from "axios";
import { readJwtPayload, resolveUsername, isTokenExpired } from "./auth";

export type AuthContext = {
  token: string;
  username: string;
};

type LobbySagaInput = { kind: "create"; lobbyName: string } | { kind: "join"; lobbyId: string };

type LobbySagaResult = { lobbyId: string; playerId: string };

export function persistAuthFromToken(token: string) {
  const payload = readJwtPayload(token);
  const username = resolveUsername(payload);
  if (username) sessionStorage.setItem("username", username);
}

export function ensureAuthenticatedUser(): AuthContext {
  const token = sessionStorage.getItem("token");
  const cachedUsername = sessionStorage.getItem("username");
  const payload = token ? readJwtPayload(token) : null;

  if (!token || isTokenExpired(token)) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    throw new Error("UNAUTHENTICATED");
  }

  const username = resolveUsername(payload) || cachedUsername;
  if (!username) throw new Error("USERNAME_MISSING");

  sessionStorage.setItem("username", username);
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
