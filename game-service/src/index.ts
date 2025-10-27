import { initNats } from "./nats-client";
import Game from "./game/game";
import Player from "./game/player";
import type { Move } from "./dtos/move";

// Keep all game instances in memory
const games: Game[] = [];

async function start() {
  const nats = await initNats();

  // Utility to publish game updates
  function publishEvent(type: string, payload: any, recepient: any) {
    nats.sendMessage("game.event", { type, payload, recepient });
  }

  // Subscribe to player registration
  nats.subscribe("game.register", async (msg: string) => {
    const { id, playerId, socketId } = JSON.parse(msg);

    let game = games.find((g) => g.state.id === id);
    if (!game) {
      game = new Game(id);

      // Wire up game event system
      game.on((event) => {
        publishEvent(event.type, event.payload, event.recepient);
      });

      games.push(game);
    }

    // Check if player already exists (reconnect)
    let player = game.state.players.find((p) => p.playerId === playerId);
    if (player) {
      game.reassignClientId(playerId, socketId);
      console.log(`[INFO] Reconnected player: ${playerId}`);
      game.emit({ type: "SEND_CARDS", payload: game.state.players });
      return;
    }

    // Otherwise, new player joins
    player = new Player(playerId, `team ${game.state.players.length % 2}`, socketId);
    game.addPlayer(player);
    console.log("[INFO] New player joined:", player.playerId);
  });

  nats.subscribe("game.start", async (msg: string) => {
    const {id} = JSON.parse(msg);
    let game = games.find((g) => g.state.id === id);
    if (!game) throw Error("Game not found");    

    game.start();
  });

  // Subscribe to bids
  nats.subscribe("game.bid", async (msg: string) => {
    const { gameId, playerId, contract } = JSON.parse(msg);
    const game = games.find((g) => g.state.id === gameId);
    if (!game) throw Error("Game not found");

    try {
      game.handleBidInput({ playerId, contract });
    } catch (err) {
      console.log("[ERROR]", (err as Error).message);
    }
  });

  // Subscribe to moves
  nats.subscribe("game.move", async (msg: string) => {
    const { gameId, move } = JSON.parse(msg);
    const game = games.find((g) => g.state.id === gameId);
    if (!game) throw Error("Game not found");

    try {
      game.handleMoveInput(move);
    } catch (err) {
      console.log("[ERROR]", (err as Error).message);
    }
  });

  // Subscribe to disconnects (optional)
  nats.subscribe("game.disconnect", async (msg: string) => {
    const { socketId } = JSON.parse(msg);
    console.log(`[INFO] Player with socket ${socketId} disconnected`);
    // Could choose to mark player as inactive, pause the game, etc.
  });
}

start().catch((err) => console.error("[FATAL]", err));
