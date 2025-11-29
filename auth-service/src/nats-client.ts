import { connect, StringCodec } from 'nats';

const sc = StringCodec();

export async function initNats() {
  const nc = await connect({ servers: process.env.NATS_URL });
  console.log('Auth service connected to NATS');

  function sendMessage(topic: string, data: any) {
    nc.publish(topic, sc.encode(JSON.stringify(data)));
  }

  function subscribe(topic: string, callback: (msg: string, reply?: string) => void) {
    const sub = nc.subscribe(topic);
    (async () => {
      for await (const m of sub) {
        callback(sc.decode(m.data), m.reply);
        console.log('[EVENT] Recieved:', topic, sc.decode(m.data));
      }
    })();
  }

  async function request(topic: string, data: any, timeout = 2000) {
    const msg = await nc.request(topic, sc.encode(JSON.stringify(data)), { timeout });
    return JSON.parse(sc.decode(msg.data));
  }

  return { sendMessage, subscribe, request };
}