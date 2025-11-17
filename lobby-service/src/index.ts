import { v4 } from "uuid";
import { initNats } from "./nats-client.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function start() {
  const nats = await initNats();

  nats.subscribe("lobby.getAll", async (_msg, reply) => {
    const lobbies = await prisma.lobby.findMany();
    if (reply) nats.sendMessage(reply, { lobbies });
  });

  nats.subscribe("lobby.create", async (msg, reply) => {
    const { id, name, playerId, playerName } = JSON.parse(msg);

    try {
      await prisma.$transaction(async (prisma: any) => {
        await prisma.lobby.create({ data: { id: id, name: name } });
        await prisma.lobbyPlayer.create({ data: { id: v4(), lobbyId: id, playerId: playerId, name: playerName } });

        if (reply) nats.sendMessage(reply, { success: true })
      });
    } catch (err) {
      console.error("[ERROR] Failed to create lobby or player", err);
    }
  });

  nats.subscribe("lobby.join", async (msg, reply) => {
    const { lobbyId, playerId, playerName } = JSON.parse(msg);

    const playersInLobby = await prisma.lobbyPlayer.findMany({ where: { lobbyId } });

    if (playersInLobby.length < 3) {
      await prisma.lobbyPlayer.create({ data: { id: v4(), lobbyId, playerId, name: playerName } });
      if (reply) nats.sendMessage(reply, { success: true, full: false });
    } else if (playersInLobby.length < 4) {
      await prisma.lobbyPlayer.create({ data: { id: v4(), lobbyId, playerId, name: playerName } });
      await prisma.lobby.update({ where: { id: lobbyId }, data: { status: "full" } });
      if (reply) nats.sendMessage(reply, { success: true, full: true });
    }
    else {
      if (reply) nats.sendMessage(reply, { success: false, error: "Lobby full" });
    }
  });

  nats.subscribe("lobby.delete", async (msg, reply) => {
    const { id } = JSON.parse(msg);
    console.log("[DEBUG] here in lobby.delete. reply value:", reply);

    await prisma.$transaction(async (prisma) => {
      await prisma.lobbyPlayer.deleteMany({ where: { lobbyId: id } });
      await prisma.lobby.delete({ where: { id } });

      console.log("[DEBUG] Inside transaction");

      if (reply) nats.sendMessage(reply, { success: true });
    });

    console.log("[DEBUG] Finished transaction");
  });
}

start().catch((err) => console.error("[FATAL]", err));