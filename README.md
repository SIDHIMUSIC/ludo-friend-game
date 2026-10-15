# Ludo Friend Game

Web-based Ludo to play with friends (hotseat).

## Secret: Environment me color do jo jitega (Vercel)

### Vercel pe deploy karo
1. Repo connect karo Vercel se
2. Project Settings → Environment Variables
3. Add variable:
   - **Name:** `WINNER_COLOR`
   - **Value:** `red`   (ya green / yellow / blue)
4. Redeploy

Jab bhi game load hoga, `/api/winner` se color aa jayega aur wahi color jeetega (dice bias se).

### Console se bhi (optional)
```js
cheat('red')
```

### URL se bhi
`?winner=red`

**Doston ko mat batana!**
