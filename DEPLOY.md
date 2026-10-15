# Deploy Guide — Railway (Backend) + Vercel (Frontend)

## 1. Backend on Railway

1. Go to https://railway.app → Login with GitHub
2. New Project → Deploy from GitHub repo → select `ludo-friend-game`
3. Root Directory set karo: `server`
4. Environment Variables add karo:
   - `WINNER_COLOR` = `red` (optional, jo color jeetna ho)
   - `PORT` automatically set hota hai
5. Deploy
6. Deploy hone ke baad **Settings → Networking → Generate Domain**
7. Domain copy karo (e.g. `https://ludo-server-xxxx.up.railway.app`)

## 2. Frontend on Vercel

1. Go to https://vercel.com → New Project → Import `ludo-friend-game`
2. Root Directory: `client`
3. Framework Preset: Vite
4. Environment Variable:
   - `VITE_SERVER_URL` = `https://your-railway-domain.up.railway.app` (Railway wala URL)
5. Deploy

## 3. Test

- Vercel URL open karo
- Create Room (bots ke saath) ya Join Room
- Friends ko room code bhejo

## Notes

- Railway free tier pe server sleep ho sakta hai (first request slow)
- Secret winner color: Railway pe `WINNER_COLOR=green` set karo, redeploy
