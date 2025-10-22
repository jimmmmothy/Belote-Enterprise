import { connect, StringCodec } from "nats";

const sc = StringCodec();

export async function initNats() {
  const nc = await connect({ servers: "nats://nats:4222" });
  console.log("Main server connected to NATS");

  function sendMessage(topic: string, data: any) {
    nc.publish(topic, sc.encode(JSON.stringify(data)));
  }

  function subscribe(topic: string, callback: (msg: string) => void) {
    const sub = nc.subscribe(topic);
    (async () => {
      for await (const m of sub) {
        callback(sc.decode(m.data));
      }
    })();
  }

  return { sendMessage, subscribe };
}