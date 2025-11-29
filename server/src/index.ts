import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { v4 } from 'uuid';
import type { Move } from './dtos/move.js';
import { initNats } from './nats-client.js'; 

const app = express();
app.use(express.json());
app.use(function (_req, res, next) { // CORS stuff
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// const register = new client.Registry(); // Metrics
// client.collectDefaultMetrics({ register });

// const lobbyCreated = new client.Counter({
//   name: "lobbies_created_total",
//   help: "Total number of lobbies created",
// });
// register.registerMetric(lobbyCreated);

let nats: {
  sendMessage: (topic: string, data: any) => void;
  subscribe: (topic: string, callback: (msg: string) => void) => void;
  request: (topic: string, data: any, timeout?: number) => any;
};

initNats()
  .then(r => {
    nats = r;
    console.log('NATS ready');
  })
  .then(() => {
    start().catch((err) => console.error('[FATAL]', err));
  })
  .catch(err => console.log('[ERROR] NATS connection error:', err));

app.post('/auth/register', async (req, res) => {
  try {
    const data = req.body;
    const result = await nats.request('auth.register', data, 3000 );
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json({ token: result.token });
  } catch (err) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const data = req.body;
    const result = await nats.request('auth.login', data, 3000);
    if (result.error) return res.status(401).json({ error: result.error });
    res.status(200).json({ token: result.token });
  } catch (err) {
    res.status(500).json({ error: 'Auth service unavailable' });
  }
});

app.get('/lobbies', async (_req, res) => {
  try {
    const result = await nats.request('lobby.getAll', {});
    res.json(result.lobbies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

app.post('/lobbies', async (req, res) => {
  const { lobbyName, playerName } = req.body;
  const lobbyId = v4();
  const playerId = v4();

  console.log('[DEBUG] Creating lobby with ID:', lobbyId);
  const result = await nats.request('lobby.create', { id: lobbyId, name: lobbyName, playerId, playerName });
  if (result.success) { // Lobby created
    // Tell the game service a player has joined
    nats.sendMessage('game.register', { id: lobbyId, playerId }); // Can also extend to add player name

    // lobbyCreated.inc(); // Increment metric
    res.status(201).json({ lobbyId, playerId });
  }
});

app.post('/lobbies/:id/join', async (req, res) => {
  const { playerName } = req.body;
  const lobbyId = req.params.id;
  const playerId = v4();

  try {
    const result = await nats.request('lobby.join', { lobbyId, playerId, playerName });
    if (result.success) {
      // Tell the game service a player has joined
      nats.sendMessage('game.register', { id: lobbyId, playerId }); // Can also extend to add player name
      if (result.full) nats.sendMessage('game.start', { id: lobbyId });
      res.status(200).json({ full: result.full, playerId });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to join lobby' });
  }
});

app.delete('/lobbies/:id', async (req, res) => {
  const lobbyId = req.params.id;

  const result = await nats.request('lobby.delete', { id: lobbyId });
  console.log('[DEBUG] delete result:', result);
  if (result.success) {
    res.status(200).json({});
  }
});

// app.get("/metrics", async (_req, res) => {
//   res.set("Content-Type", register.contentType);
//   res.end(await register.metrics());
// });

async function start() {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', ({ lobbyId, playerId }: { lobbyId: string, playerId: string }) => {
      // Tell the game service a player has joined
      nats.sendMessage('game.register', { id: lobbyId, playerId, socketId: socket.id });

      socket.emit('assigned_id', playerId);
      socket.join(lobbyId);
    });

    socket.on('select_contract', (data) => {
      nats.sendMessage('game.bid', data);
    });

    socket.on('play_move', (data: Move) => {
      nats.sendMessage('game.move', data);
    });

    socket.on('disconnect', () => {
      console.log(`[INFO] ${socket.id} disconnected`);
      nats.sendMessage('game.disconnect', { socketId: socket.id });
    });
  });

  // Step 3: listen for events from the game service
  nats.subscribe('game.event', (msg: any) => {
    const event = JSON.parse(msg);
    console.log('[EVENT]', event.type);

    switch (event.type) {
    case 'SEND_CARDS':
      for (const player of event.payload) {
        const data = {
          myId: player.playerId,
          hand: player.cards,
          players: event.payload.map((p: any) => ({ id: p.playerId, handLength: p.cards.length })),
        };
        io.to(player.socketId).emit('send_cards', data);
      }
      break;

    case 'BIDDING_TURN':
      console.log(event);
      io.to(event.recepient).emit('bidding_turn', event.payload);
      break;

    case 'BID_PLACED':
      io.to(event.recepient).emit('bid_placed', event.payload);
      break;

    case 'BIDDING_FINISHED':
      io.to(event.recepient).emit('bidding_finished', event.payload);
      break;

    case 'PLAYING_TURN':
      io.to(event.recepient).emit('playing_turn');
      break;

    case 'MOVE_PLAYED':
      io.to(event.recepient).emit('move_played', event.payload);
      break;

    case 'TRICK_FINISHED':
      io.to(event.recepient).emit('trick_finished');
      break;

    case 'ROUND_FINISHED':
      io.to(event.recepient).emit('round_finished', event.payload);
      break;
    }
  });

  // Step 4: start HTTP server
  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });


}