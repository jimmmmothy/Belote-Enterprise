import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { v4 } from 'uuid';
import type { Move } from './dtos/move.js';
import { initNats } from './nats-client.js'; 
import { createProfileRoutes } from './routes/profileRoutes.js';
import { createPrivacyRoutes } from './routes/privacyRoutes.js';
import type { NatsClient } from './types/nats.js';
import { authMiddleware } from './middleware/auth.js';
import jwt from 'jsonwebtoken';
import { createAuthRoutes } from './routes/authRoutes.js';

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

let nats: NatsClient;

initNats()
  .then(r => {
    nats = r;
    console.log('NATS ready');
  })
  .then(() => {
    start().catch((err) => console.error('[FATAL]', err));
  })
  .catch(err => console.log('[ERROR] NATS connection error:', err));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/lobbies', async (_req, res) => {
  try {
    const result = await nats.request('lobby.getAll', {});
    res.json(result.lobbies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

app.post('/lobbies', authMiddleware, async (req, res) => {
  const { lobbyName, playerName } = req.body;
  const lobbyId = v4();
  const playerId = req.user!.userId;
  const username = req.user!.username;

  console.log('[DEBUG] Creating lobby with ID:', lobbyId);
  const result = await nats.request('lobby.create', { id: lobbyId, name: lobbyName, playerId, playerName });
  if (result.success) { // Lobby created
    // Tell the game service a player has joined
    nats.sendMessage('game.register', { id: lobbyId, playerId, username }); // Can also extend to add player name

    // lobbyCreated.inc(); // Increment metric
    res.status(201).json({ lobbyId, playerId });
  }
});

app.post('/lobbies/:id/join', authMiddleware, async (req, res) => {
  const { playerName } = req.body;
  const lobbyId = req.params.id;
  const playerId = req.user!.userId;
  const username = req.user!.username;

  try {
    const result = await nats.request('lobby.join', { lobbyId, playerId, playerName });
    if (result.success) {
      // Tell the game service a player has joined
      nats.sendMessage('game.register', { id: lobbyId, playerId, username }); // Can also extend to add player name
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

app.get('/profiles/health', async (_req, res) => {
  try {
    const result = await nats.request('profile.health', {});
    if (result.status) return res.status(200).json(result);
    return res.status(500).json({error: 'Profile service down'});
  } catch (err) {
    console.error('[ERROR] Failed to fetch profile', err);
    return res.status(500).json({ error: 'Profile service unavailable' });
  }
});

app.get('/profiles/:userId', async (req, res) => {
  try {
    const result = await nats.request('profile.get', { userId: req.params.userId });
    if (result.error) return res.status(404).json({ error: result.error });
    return res.json(result.profile);
  } catch (err) {
    console.error('[ERROR] Failed to fetch profile', err);
    return res.status(500).json({ error: 'Profile service unavailable' });
  }
});

app.post('/profiles', async (req, res) => {
  try {
    const result = await nats.request('profile.create', req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    return res.status(201).json(result.profile);
  } catch (err) {
    console.error('[ERROR] Failed to create profile', err);
    return res.status(500).json({ error: 'Profile service unavailable' });
  }
});

app.put('/profiles/:userId', async (req, res) => {
  try {
    const result = await nats.request('profile.update', { ...req.body, userId: req.params.userId });
    if (result.error) return res.status(400).json({ error: result.error });
    return res.json(result.profile);
  } catch (err) {
    console.error('[ERROR] Failed to update profile', err);
    return res.status(500).json({ error: 'Profile service unavailable' });
  }
});

app.post('/match-history', async (req, res) => {
  try {
    const result = await nats.request('match-history.insert', req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    return res.status(201).json(result);
  } catch (err) {
    console.error('[ERROR] Failed to insert match history entries', err);
    return res.status(500).json({ error: 'Profile service unavailable' });
  }
});

app.get('/match-history/me', authMiddleware, async (req, res) => {
  const limit = Number.parseInt((req.query.limit as string) || '20', 10);
  const cursor = req.query.cursor as string | undefined;

  if (Number.isNaN(limit) || limit <= 0) return res.status(400).json({ error: 'limit must be a positive number' });

  try {
    const result = await nats.request('match-history.get', {
      userId: req.user!.userId,
      limit,
      cursor
    });
    if (result.error) return res.status(400).json({ error: result.error });
    return res.json(result);
  } catch (err) {
    console.error('[ERROR] Failed to fetch match history', err);
    return res.status(500).json({ error: 'Profile service unavailable' });
  }
});

async function start() {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    const token = socket.handshake.auth?.token as string | undefined;
    let authUserId: string | undefined;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as { userId?: string };
        authUserId = decoded.userId;
      } catch (err) {
        console.error('[AUTH] Invalid socket token', err);
      }
    }

    socket.on('register', ({ lobbyId, playerId }: { lobbyId: string, playerId: string }) => {
      // Tell the game service a player has joined
      const resolvedPlayerId = authUserId ?? playerId ?? v4();
      nats.sendMessage('game.register', { id: lobbyId, playerId: resolvedPlayerId, socketId: socket.id });

      socket.emit('assigned_id', resolvedPlayerId);
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
  app.use('/auth', createAuthRoutes(nats));
  app.use('/api', createProfileRoutes(nats));
  app.use('/api', createPrivacyRoutes(nats));
  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });


}
