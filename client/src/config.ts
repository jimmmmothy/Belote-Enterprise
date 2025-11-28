export interface ClientConfig {
  serverUrl: string;
}

let configCache: ClientConfig | null = null;

export async function loadConfig(): Promise<ClientConfig | null> {
  if (configCache) return configCache;

  // Use baked-in env for local dev, fall back to runtime config.json for cluster
  if (import.meta.env.VITE_SERVER_URL) {
    configCache = { serverUrl: import.meta.env.VITE_SERVER_URL };
    return configCache;
  }

  const res = await fetch("/config.json");
  configCache = await res.json();
  return configCache;
}
