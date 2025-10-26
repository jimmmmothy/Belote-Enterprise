import { initNats } from "./nats-client";
import Game from "./game/game";
import Player from "./game/player";
import type { Move } from "./dtos/move";

// Keep all game instances in memory
const games: Game[] = [];

async function start() {
  const nats = await initNats();

  // Utility to publish game updates
  function publishEvent(type: string, payload: any) {
    nats.sendMessage("game.event", { type, payload });
  }

  // Subscribe to player registration
  nats.subscribe("game.register", async (msg: string) => {
    const { playerId, socketId } = JSON.parse(msg);

    let game = games.find((g) => g.state.id === "demo");
    if (!game) {
      game = new Game("demo");

      // Wire up game event system
      game.on((event) => {
        publishEvent(event.type, event.payload);
      });

      games.push(game);
    }

    // Check if player already exists (reconnect)
    let player = game.state.players.find((p) => p.playerId === playerId);
    if (player) {
      game.reassignClientId(playerId, socketId);
      console.log(`[INFO] Reconnected player: ${playerId}`);
      return;
    }

    // Otherwise, new player joins
    player = new Player(socketId, playerId, `team ${game.state.players.length % 2}`);

    try {
      const playerCount = game.addPlayer(player);
      console.log("[INFO] New player joined:", player.playerId);

      if (playerCount === 4) {
        game.start(); // start once full
      }
    } catch (err) {
      console.log("[ERROR]", (err as Error).message);
    }
  });

  // Subscribe to bids
  nats.subscribe("game.bid", async (msg: string) => {
    const data = JSON.parse(msg);
    const game = games.find((g) => g.state.id === "demo");
    if (!game) return;

    try {
      game.handleBidInput(data);
    } catch (err) {
      console.log("[ERROR]", (err as Error).message);
    }
  });

  // Subscribe to moves
  nats.subscribe("game.move", async (msg: string) => {
    const data: Move = JSON.parse(msg);
    const game = games.find((g) => g.state.id === "demo");
    if (!game) return;

    try {
      game.handleMoveInput(data);
    } catch (err) {
      console.log("[ERROR]", (err as Error).message);
    }
  });

  // Subscribe to disconnects (optional)
  nats.subscribe("game.disconnect", async (msg: string) => {
    const { socketId } = JSON.parse(msg);
    console.log(`[INFO] Player with socket ${socketId} disconnected`);
    // You can choose to mark player as inactive, pause the game, etc.
  });
}

start().catch((err) => console.error("[FATAL]", err));
