import { initNats } from "./nats-client.js";
import Game from "./game/game.js";
import Player from "./game/player.js";

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
    const { id } = JSON.parse(msg);

    const MAX_RETRIES = 5;       // configurable (e.g. retry up to 5 times)
    const RETRY_DELAY_MS = 200;  // wait 200ms between retries

    let retries = 0;

    while (retries < MAX_RETRIES) {
      const game = games.find((g) => g.state.id === id);

      if (!game) {
        console.warn(`[WARN] [${id}] Not found (retry ${retries + 1}/${MAX_RETRIES})`);
    } else if (game.state.players.length === 4) {
        console.log(`[INFO] [${id}] All players ready — starting game`);
        try {
          game.start();
        } catch (err) {
          console.error(`[ERROR] [${id}] Error starting game:`, err);
        }
        return; // success, stop retrying
      } else {
        console.warn(
          `[WARN] [${id}] Only ${game.state.players.length}/4 players (retry ${retries + 1}/${MAX_RETRIES})`
        );
      }

      retries++;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    console.error(`[ERROR] [${id}] Failed to start game after ${MAX_RETRIES} retries`);
  });


  // Subscribe to bids
  nats.subscribe("game.bid", async (msg: string) => {
    const { gameId, playerId, contract } = JSON.parse(msg);
    const game = games.find((g) => g.state.id === gameId);

    if (!game) {
      console.error("Game not found");
      return;
    }

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
    if (!game) {
      console.error("Game not found");
      return;
    }

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
