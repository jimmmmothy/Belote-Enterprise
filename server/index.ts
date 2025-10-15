import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'; 
import Player from './game/player.ts';
import { v4 } from 'uuid'
import Game from './game/game.ts';
import type { SendHand } from './dtos/send-hand.ts';
import type { Move } from './dtos/move.ts';
import { availableContracts } from './game/phases/bidding.ts';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let games: Game[] = [];

io.on('connection', (socket) => {
  socket.on("register", (playerId: string | null) => {
    let game = games.find((g) => g.state.id === "demo");
    if (!game) {
      game = new Game("demo");

      // Subscribe to game events
      game.on((event) => {
        console.log("[EVENT]", event.type);
        switch (event.type) {
          case "SEND_CARDS":
            for (const player of event.payload) {
              const data: SendHand = {
                myId: player.playerId,
                hand: player.cards,
                players: game!.state.players.map((p) => ({ id: p.playerId, handLength: p.cards.length })),
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
            io.to("demo").emit("trick_finished", event.payload);
            break;

          case "ROUND_FINISHED":
            io.to("demo").emit("round_finished", event.payload);
            break;
        }
      });

      games.push(game);
    }

    socket.join("demo");

    let player = game.state.players.find(p => p.playerId === playerId);

    if (playerId && player) { // If player refreshed their page
      console.log("[INFO] Returning player:", playerId);
      let handData: SendHand = { myId: playerId, hand: player.cards, players: []}
      game.state.players.forEach(p => {
        handData.players.push({ id: p.playerId, handLength: p.cards.length });
      });

      io.to(socket.id).emit("send_cards", handData);
      io.to(socket.id).emit("send_trick", game.state.currentTrick);
      if (game.state.players[game.state.currentPlayerIndex].playerId === playerId) {
        if (game.state.phase === "BIDDING")
          io.to(socket.id).emit("bidding_turn", availableContracts(game.state));
        else if (game.state.phase === "PLAYING")
          io.to(socket.id).emit("playing_turn");
      }
      game.reassignClientId(playerId, socket.id);
      return;
    }

    // New player
    const newId = v4();
    player = new Player(socket.id, newId);
    
    try {
      const playerCount = game.addPlayer(player);
      socket.emit("assigned_id", newId);
      console.log("[INFO] New player:", newId);

      if (playerCount === 4) { // 4 players have joined. Ready to launch game        
        game.start();
      }
    } catch (e) {
      console.log((e as Error).message);
    }
  });

  // Players making their bid / contract
  socket.on("select_contract", (data: { playerId: string; contract: string }) => {
    const game = games.find((g) => g.state.id === "demo");
    if (!game) return;

    try {
      game.handleBidInput(data);
    } catch (e: any) {
      console.log("[ERROR]", e.message)
    }
  });

  // Players playing a card / trick
  socket.on("play_move", (data: Move) => {
    const game = games.find((g) => g.state.id === "demo");
    if (!game) return;

    try {
      game.handleMoveInput(data);
    } catch (e: any) {
      console.log("[ERROR]", e.message)
    }
  });
  
  socket.on("disconnect", () => {
    // clientRepo.remove(player);
    console.log(`[INFO] ${socket.id} disconnected`);
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});