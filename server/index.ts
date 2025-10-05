import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'; 
import Player from './player.ts';
import { v4 } from 'uuid'
import Game from './game.ts';
import type { SendHand } from './dtos/send-hand.ts';
import type { Move } from './dtos/move.ts';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let games: Game[] = [];

io.on('connection', (socket) => {
  socket.on("register", (playerId: string | null) => {
    if (!games.find(g => g.id === "demo")) { // If demo game doesn't exist yet -> create it || Will be changed later
        const game = new Game("demo", {
          onBiddingPhase: (socketId, available) => {
            io.to(socketId).emit("bidding_phase", available);
          },
          notifyPlayerTurn(socketId) {
            io.to(socketId).emit("your_turn");
          },
          onDealtCards: (players) => {
            players.forEach(p => {
              let data: SendHand = { myId: p.playerId, hand: p.cards, players: []}
              game.players.forEach(p => { // Completely unnecessary because data.players is the same for each player. Could be extracted outside
                data.players.push({ id: p.playerId });
              });
              
              io.to(p.socketId).emit("send_hand", data);
            });
          },
          onPlayingPhase(gameId, trick, nextPlayer) {
            io.to(gameId).emit("played_move", { trick, nextPlayer } );
          },
        }
      );
      
      games.push(game);
    }

    const game = games.find(g => g.id === "demo"); // Get existing (or just created) game
    if (!game) throw Error("Game not found!");

    socket.join("demo");
    let player = game.players.find(p => p.playerId === playerId);

    if (playerId && player) { // If player refreshed their page
      console.log("[INFO] Returning player:", playerId);
      let data: SendHand = { myId: playerId, hand: player.cards, players: []}
      game.players.forEach(p => { // Completely unnecessary because data.players is the same for each player. Could be extracted outside
        data.players.push({ id: p.playerId });
      });
      io.to(socket.id).emit("send_cards", data);
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
  socket.on("select_contract", (data: { playerId: string, contract: string }) => { 
    const game = games.find(g => g.id === "demo");
    if (!game) return;

    try {
      game.handleBid(data.playerId, data.contract);
    } catch (e) {
      console.log("[ERROR] Contract error:", (e as Error).message);
    }
  });

  // Players playing their move
  socket.on("play_move", (data: Move) => { 
    const game = games.find(g => g.id === "demo");
    if (!game) return;

    try {
      game.handlePlayingMove(data);
    } catch (e) {
      console.log("[ERROR] Playing error:", (e as Error).message);
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