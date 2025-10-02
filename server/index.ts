import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io'; 
import clientRepo from './client-repo.ts';
import Dealer from './dealer.ts';
import Player from './player.ts';
import type { Move } from './dtos/move.ts';
import { v4 } from 'uuid'

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const dealer = new Dealer();

io.on('connection', (socket) => {
  socket.on("register", (playerId: string | null) => {
    if (playerId && clientRepo.findByPlayerId(playerId)) {
      console.log("Returning player:", playerId);
      io.to(socket.id).emit("sendCards", clientRepo.findByPlayerId(playerId)!.cards);
      clientRepo.reassignClientId(playerId, socket.id);
      return;
    }
    
    if (clientRepo.get().length >= 4) { // Server full! Should throw error to client eventually maybe hopefully
      console.log("Server full");
      return;
    }

    const newId = v4();
    const player = new Player(socket.id, newId);
    clientRepo.add(player);
    socket.emit("assignedId", newId);
    console.log("New player:", newId);

    if (clientRepo.get().length === 4) {
      dealer.firstDeal(clientRepo.get());
      dealer.secondDeal(clientRepo.get());
      clientRepo.get().forEach(p => {
        io.to(p.socketId).emit("sendCards", p.cards);
      });
    }
  });

  socket.on("playMove", (move : Move) => {
    io.emit("movePlayed", move);
  });
  
  socket.on("disconnect", () => {
    // clientRepo.remove(player);
    console.log(`${socket.id} disconnected`);
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});