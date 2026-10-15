# Ludo Multiplayer (Ludo King Style)

## Current Status
Foundation for real-time multiplayer Ludo.

### Run locally
**Server:**
```bash
cd server
npm install
npm start
```

**Client:**
```bash
cd client
npm install
npm run dev
```

### Secret Winner Color
Set environment variable on server:
```
WINNER_COLOR=red
```
That color gets biased dice rolls.

### Deploy
- Frontend (client): Vercel
- Backend (server): Railway / Render / Fly.io (Socket.IO needs persistent server)

Set `VITE_SERVER_URL` in client env to your deployed server URL.

### Next steps
- Full board UI with tokens on 15x15 grid
- Animations
- Bots
- Better room management
- Auth, rewards, etc.
