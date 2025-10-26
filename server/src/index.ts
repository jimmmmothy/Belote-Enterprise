import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { v4 } from "uuid";
import type { Move } from "./dtos/move";
import { initNats } from "./nats-client";

const app = express();
app.use(express.json());
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let nats: {
  sendMessage: (topic: string, data: any) => void;
  subscribe: (topic: string, callback: (msg: string) => void) => void;
  request: (topic: string, data: any, timeout?: number) => any;
};

initNats()
  .then(r => {
    nats = r;
    console.log("NATS ready");
  })
  .then(() => {
    start().catch((err) => console.error("[FATAL]", err));
  })
  .catch(err => console.log("[ERROR] NATS connection error:", err));


app.get("/lobbies", async (req, res) => {
  try {
    const result = await nats.request("lobby.getAll", {});
    res.json(result.lobbies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lobbies" });
  }
});

app.post("/lobbies", async (req, res) => {
  const { lobbyName, playerName, playerId } = req.body;
  const lobbyId = v4();

  nats.sendMessage("lobby.create", { id: lobbyId, name: lobbyName, playerId, playerName });
  res.status(201).json({ id: lobbyId });
});

app.post("/lobbies/:id/join", async (req, res) => {
  const { playerId, playerName } = req.body;
  const lobbyId = req.params.id;

  try {
    const result = await nats.request("lobby.join", { lobbyId, playerId, playerName });
    if (result.success) {
      res.status(200).json({ player: result.player });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to join lobby" });
  }
});

async function start() {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_lobby", (data: { lobbyId: string, playerId: string }) => {
      nats.sendMessage("lobby.join", { ...data, socketId: socket.id });
    });

    socket.on("register", (playerId: string | null) => {
      const newId = playerId || v4();

      // Tell the game service a player has joined
      nats.sendMessage("game.register", { playerId: newId, socketId: socket.id });

      socket.emit("assigned_id", newId);
      socket.join("demo");
    });

    socket.on("select_contract", (data) => {
      nats.sendMessage("game.bid", data);
    });

    socket.on("play_move", (data: Move) => {
      nats.sendMessage("game.move", data);
    });

    socket.on("disconnect", () => {
      console.log(`[INFO] ${socket.id} disconnected`);
      nats.sendMessage("game.disconnect", { socketId: socket.id });
    });
  });

  // Step 3: listen for events from the game service
  nats.subscribe("game.event", (msg: any) => {
    const event = JSON.parse(msg);
    console.log("[EVENT]", event.type);

    switch (event.type) {
      case "SEND_CARDS":
        for (const player of event.payload) {
          const data = {
            myId: player.playerId,
            hand: player.cards,
            players: event.payload.map((p: any) => ({ id: p.playerId, handLength: p.cards.length })),
          };
          io.to(player.socketId).emit("send_cards", data);
        }
        break;

      case "BIDDING_TURN":
        io.to(event.payload.socketId).emit("bidding_turn", event.payload.availableContracts);
        break;

      case "BID_PLACED":
        io.to("demo").emit("bid_placed", event.payload);
        break;

      case "BIDDING_FINISHED":
        io.to("demo").emit("bidding_finished", event.payload);
        break;

      case "PLAYING_TURN":
        io.to(event.payload.socketId).emit("playing_turn");
        break;

      case "MOVE_PLAYED":
        io.to("demo").emit("move_played", event.payload);
        break;

      case "TRICK_FINISHED":
        io.to("demo").emit("trick_finished");
        break;

      case "ROUND_FINISHED":
        io.to("demo").emit("round_finished", event.payload);
        break;
    }
  });

  // Step 4: start HTTP server
  server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });

  
}
