import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'; 
import Player from './player.ts';
import { v4 } from 'uuid'
import Game from './game.ts';
import type { SendCards } from './dtos/send-cards.ts';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let games: Game[] = [];

io.on('connection', (socket) => {
  socket.on("register", (playerId: string | null) => {
    if (!games.find(g => g.id === "demo")) { // If game doesn't exist yet -> create it
        const game = new Game("demo", {
          onContractPhase: (gameId: string) => {
            io.to(gameId).emit("contract_phase");
          },
          onDealtCards: (players: Player[]) => {
            players.forEach(p => {
              let data: SendCards = { myId: p.playerId, hand: p.cards, players: []}
              game.players.forEach(p => { // Completely unnecessary because data.players is the same for each player. Could be extracted outside
                data.players.push({ id: p.playerId });
              });
              
              io.to(p.socketId).emit("send_cards", data);
            });
          }
        }
      );
      
      games.push(game);
    }

    const game = games.find(g => g.id === "demo"); // Get existing (or just created) game
    socket.join("demo");
    let player = game!.players.find(p => p.playerId === playerId);

    if (playerId && player) { // If player refreshed their page
      console.log("Returning player:", playerId);
      let data: SendCards = { myId: playerId, hand: player.cards, players: []}
      game!.players.forEach(p => { // Completely unnecessary because data.players is the same for each player. Could be extracted outside
        data.players.push({ id: p.playerId });
      });
      io.to(socket.id).emit("send_cards", data);
      game!.reassignClientId(playerId, socket.id);
      return;
    }

    // New player
    const newId = v4();
    player = new Player(socket.id, newId);
    
    try {
      const playerCount = game!.addPlayer(player);
      socket.emit("assigned_id", newId);
      console.log("New player:", newId);

      if (playerCount === 4) { // 4 players have joined. Ready to launch game
        game!.start();
      }
    } catch (e) {
      console.log((e as Error).message);
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