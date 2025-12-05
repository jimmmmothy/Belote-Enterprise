import axios, { type AxiosInstance } from "axios";
import { loadConfig } from "../config";

let cachedClient: AxiosInstance | null = null;

async function getBaseUrl(): Promise<string> {
  const config = await loadConfig();
  return config?.serverUrl || "";
}

export async function getApiClient(): Promise<AxiosInstance> {
  if (cachedClient) return cachedClient;
  const baseURL = await getBaseUrl();

  cachedClient = axios.create({ baseURL });

  cachedClient.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  return cachedClient;
}
