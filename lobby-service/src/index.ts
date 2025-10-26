import { v4 } from "uuid";
import { initNats } from "./nats-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function start() {
  const nats = await initNats();

  nats.subscribe("lobby.getAll", async (msg, reply) => {
    const lobbies = await prisma.lobby.findMany();
    if (reply) nats.sendMessage(reply, { lobbies });
  });

  nats.subscribe("lobby.create", async (msg) => {
    const { id, name, playerId, playerName } = JSON.parse(msg);

    try {
      await prisma.$transaction(async (prisma: any) => {
        const lobby = await prisma.lobby.create({
          data: { id: id, name: name },
        });

        const player = await prisma.lobbyPlayer.create({
          data: { id: v4(), lobbyId: lobby.id, playerId: playerId, name: playerName },
        });

        console.log("[DB] Lobby and first player created:", lobby, player);
      });
    } catch (err) {
      console.error("[ERROR] Failed to create lobby or player", err);
    }
  });

  nats.subscribe("lobby.join", async (msg, reply) => {
    const { lobbyId, playerId, playerName } = JSON.parse(msg);

    const playersInLobby = await prisma.lobbyPlayer.findMany({ where: { lobbyId } });

    if (playersInLobby.length < 4) {
      const player = await prisma.lobbyPlayer.create({ data: { id: v4(), lobbyId, playerId, name: playerName } });
      if (reply) nats.sendMessage(reply, { success: true, player });
    } else {
      if (reply) nats.sendMessage(reply, { success: false, error: "Lobby full" });
    }
  });
}

start().catch((err) => console.error("[FATAL]", err));