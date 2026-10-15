import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createGameState, rollDice, moveToken, getLegalMoves, chooseBotMove, COLORS } from './rules.js';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getForcedColor() {
  return process.env.WINNER_COLOR || null;
}

function processBotTurn(code) {
  const room = rooms.get(code);
  if (!room || room.state.winner) return;
  const state = room.state;
  const current = state.players[state.currentPlayerIndex];
  if (!current?.isBot) return;

  setTimeout(() => {
    if (!rooms.has(code) || state.winner) return;
    const result = rollDice(state, getForcedColor());
    io.to(code).emit('diceRolled', { roll: result?.roll, state, isBot: true });

    if (result?.skipped || !result) return;

    setTimeout(() => {
      if (!rooms.has(code) || state.winner || !state.dice) return;
      const legal = getLegalMoves(state, state.currentPlayerIndex);
      if (legal.length === 0) {
        state.dice = null;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        io.to(code).emit('stateUpdate', { state });
        processBotTurn(code);
        return;
      }
      const tid = chooseBotMove(state, state.currentPlayerIndex, 'medium');
      if (tid !== null) {
        moveToken(state, state.currentPlayerIndex, tid);
        io.to(code).emit('moved', { state, isBot: true });
      }
      if (state.players[state.currentPlayerIndex]?.isBot && !state.winner) {
        processBotTurn(code);
      }
    }, 800);
  }, 600);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('createRoom', ({ name, color, withBots = 0 }) => {
    const code = generateCode();
    const players = [{ id: socket.id, name: name || 'You', color: color || 'red', isBot: false }];
    const used = new Set([players[0].color]);
    for (let i = 0; i < withBots && players.length < 4; i++) {
      const botColor = COLORS.find(c => !used.has(c)) || COLORS[i+1];
      used.add(botColor);
      players.push({ id: 'bot-' + i, name: 'Bot ' + (i+1), color: botColor, isBot: true });
    }
    const state = createGameState(players);
    state.status = 'playing';
    rooms.set(code, { state, sockets: [socket.id], host: socket.id });
    socket.join(code);
    socket.emit('roomCreated', { code, state });
    if (state.players[0].isBot) processBotTurn(code);
  });

  socket.on('joinRoom', ({ code, name }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.state.players.length >= 4) return socket.emit('error', 'Room full');
    const used = new Set(room.state.players.map(p => p.color));
    const color = COLORS.find(c => !used.has(c)) || 'blue';
    room.state.players.push({
      id: socket.id,
      color,
      name: name || 'Player',
      isBot: false,
      tokens: [0,1,2,3].map(i => ({ id: i, state: 'yard', track: -1, home: -1 })),
      finished: 0
    });
    room.sockets.push(socket.id);
    socket.join(code);
    io.to(code).emit('stateUpdate', { state: room.state });
    socket.emit('joined', { code, state: room.state });
  });

  socket.on('roll', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.state.winner) return;
    const idx = room.state.players.findIndex(p => p.id === socket.id);
    if (idx !== room.state.currentPlayerIndex || room.state.players[idx].isBot) return;
    const result = rollDice(room.state, getForcedColor());
    io.to(code).emit('diceRolled', { roll: result?.roll, state: room.state });
    if (result?.skipped) {
      if (room.state.players[room.state.currentPlayerIndex]?.isBot) processBotTurn(code);
    }
  });

  socket.on('move', ({ code, tokenId }) => {
    const room = rooms.get(code);
    if (!room || room.state.winner) return;
    const idx = room.state.players.findIndex(p => p.id === socket.id);
    if (idx !== room.state.currentPlayerIndex || room.state.players[idx].isBot) return;
    const ok = moveToken(room.state, idx, tokenId);
    if (ok) {
      io.to(code).emit('moved', { state: room.state });
      if (room.state.players[room.state.currentPlayerIndex]?.isBot && !room.state.winner) {
        processBotTurn(code);
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      room.sockets = room.sockets.filter(id => id !== socket.id);
      if (room.sockets.length === 0) rooms.delete(code);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Ludo server listening on :${PORT}`));
