import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createGameState, rollDice, moveToken, getLegalMoves } from './rules.js';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const rooms = new Map(); // roomCode -> { state, sockets }

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('createRoom', ({ name, color }) => {
    const code = generateCode();
    const player = { id: socket.id, name, color: color || 'red' };
    const state = createGameState([player]);
    rooms.set(code, { state, players: [socket.id], host: socket.id });
    socket.join(code);
    socket.emit('roomCreated', { code, state });
  });

  socket.on('joinRoom', ({ code, name, color }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.players.length >= 4) return socket.emit('error', 'Room full');
    const usedColors = room.state.players.map(p => p.color);
    const available = ['red','green','yellow','blue'].find(c => !usedColors.includes(c)) || 'blue';
    const player = { id: socket.id, name, color: color || available };
    room.state.players.push({
      id: socket.id,
      color: player.color,
      name,
      tokens: [0,1,2,3].map(i => ({ id: i, state: 'yard', track: -1, home: -1 })),
      finished: 0
    });
    room.players.push(socket.id);
    socket.join(code);
    io.to(code).emit('playerJoined', { state: room.state });
    socket.emit('joined', { code, state: room.state });
  });

  socket.on('roll', ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    const playerIndex = room.state.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== room.state.currentPlayerIndex) return;
    const forced = process.env.WINNER_COLOR || null;
    const roll = rollDice(room.state, forced);
    io.to(code).emit('diceRolled', { roll, state: room.state });
  });

  socket.on('move', ({ code, tokenId }) => {
    const room = rooms.get(code);
    if (!room) return;
    const playerIndex = room.state.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== room.state.currentPlayerIndex) return;
    const ok = moveToken(room.state, playerIndex, tokenId);
    if (ok) {
      io.to(code).emit('moved', { state: room.state });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      room.players = room.players.filter(id => id !== socket.id);
      if (room.players.length === 0) rooms.delete(code);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Ludo server on :${PORT}`));
