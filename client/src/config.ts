export interface ClientConfig {
  serverUrl: string;
}

let configCache: ClientConfig | null = null;

export async function loadConfig(): Promise<ClientConfig | null> {
  if (configCache) return configCache;

  const res = await fetch("/config.json");
  configCache = await res.json();
  return configCache;
}
