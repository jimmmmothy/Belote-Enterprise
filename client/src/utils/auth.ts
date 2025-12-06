type JwtPayload = { exp?: number; username?: string; name?: string; email?: string };

export function readJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function resolveUsername(payload: JwtPayload | null): string | null {
  if (!payload) return null;
  return (payload.username || payload.name || payload.email || "").trim() || null;
}

export function tokenExpiryMs(token: string | null): number | null {
  const payload = readJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = readJwtPayload(token);
  if (!payload) return true;
  const exp = payload.exp ? payload.exp * 1000 : null;
  if (!exp) return false;
  return Date.now() >= exp;
}

export function clearAuthSession() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("username");
  sessionStorage.removeItem("lobbyId");
  sessionStorage.removeItem("playerId");
  sessionStorage.removeItem("playerName");
  localStorage.removeItem("token");
}
