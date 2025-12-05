export interface NatsClient {
  sendMessage: (topic: string, data: any) => void;
  subscribe: (topic: string, callback: (msg: string, reply?: string) => void) => void;
  request: (topic: string, data: any, timeout?: number) => Promise<any>;
}
