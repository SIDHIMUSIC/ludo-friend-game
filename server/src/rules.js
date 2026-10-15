export const COLORS = ['red', 'green', 'yellow', 'blue'];
export const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };
export const TURN_POINT = { red: 50, green: 11, yellow: 24, blue: 37 };
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function createGameState(players) {
  return {
    players: players.map(p => ({
      id: p.id,
      color: p.color,
      name: p.name || p.color,
      isBot: !!p.isBot,
      tokens: [0,1,2,3].map(i => ({ id: i, state: 'yard', track: -1, home: -1 })),
      finished: 0
    })),
    currentPlayerIndex: 0,
    dice: null,
    sixes: 0,
    winner: null,
    history: [],
    status: 'waiting'
  };
}

export function rollDice(state, forcedColor = null) {
  if (state.winner || state.dice) return null;
  const current = state.players[state.currentPlayerIndex];
  let roll;
  if (forcedColor && forcedColor === current.color) {
    roll = Math.random() < 0.78 ? 6 : Math.floor(Math.random() * 5) + 1;
  } else if (forcedColor) {
    roll = Math.floor(Math.random() * 3) + 1;
  } else {
    roll = Math.floor(Math.random() * 6) + 1;
  }
  state.dice = roll;
  if (roll === 6) state.sixes++; else state.sixes = 0;
  if (state.sixes >= 3) {
    state.history.push(`${current.name} rolled 3 sixes — skipped`);
    nextTurn(state);
    return { roll, skipped: true };
  }
  return { roll, skipped: false };
}

export function canMove(state, playerIndex, tokenId) {
  if (state.winner || !state.dice) return false;
  const player = state.players[playerIndex];
  if (!player) return false;
  const token = player.tokens[tokenId];
  if (!token || token.state === 'finished') return false;
  if (token.state === 'yard') return state.dice === 6;
  if (token.state === 'track') {
    const next = token.track + state.dice;
    const turn = TURN_POINT[player.color];
    if (token.track <= turn && next > turn) return (next - turn - 1) < 6;
    return true;
  }
  if (token.state === 'home') return token.home + state.dice <= 5;
  return false;
}

export function getLegalMoves(state, playerIndex) {
  return [0,1,2,3].filter(i => canMove(state, playerIndex, i));
}

export function moveToken(state, playerIndex, tokenId) {
  if (!canMove(state, playerIndex, tokenId)) return false;
  const player = state.players[playerIndex];
  const token = player.tokens[tokenId];
  const dice = state.dice;

  if (token.state === 'yard') {
    token.state = 'track';
    token.track = START_INDEX[player.color];
    state.history.push(`${player.name} entered board`);
  } else if (token.state === 'track') {
    const old = token.track;
    const next = old + dice;
    const turn = TURN_POINT[player.color];
    if (old <= turn && next > turn) {
      const into = next - turn - 1;
      if (into < 6) {
        token.state = 'home';
        token.home = into;
        state.history.push(`${player.name} entered home lane`);
      }
    } else {
      token.track = next % 52;
      for (const op of state.players) {
        if (op.color === player.color) continue;
        for (const ot of op.tokens) {
          if (ot.state === 'track' && ot.track === token.track && !SAFE.has(token.track)) {
            ot.state = 'yard';
            ot.track = -1;
            state.history.push(`${player.name} captured ${op.name}`);
          }
        }
      }
    }
  } else if (token.state === 'home') {
    const nh = token.home + dice;
    if (nh === 5) {
      token.state = 'finished';
      player.finished++;
      state.history.push(`${player.name} token finished`);
      if (player.finished === 4) {
        state.winner = player.color;
        state.status = 'finished';
        state.history.push(`${player.name} WINS!`);
      }
    } else if (nh < 6) token.home = nh;
  }

  if (dice === 6 && !state.winner) {
    state.dice = null;
  } else {
    nextTurn(state);
  }
  return true;
}

function nextTurn(state) {
  state.dice = null;
  state.sixes = 0;
  if (state.winner) return;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
}

export function chooseBotMove(state, playerIndex, difficulty = 'medium') {
  const legal = getLegalMoves(state, playerIndex);
  if (legal.length === 0) return null;
  if (difficulty === 'easy') return legal[Math.floor(Math.random() * legal.length)];
  const player = state.players[playerIndex];
  let best = legal[0];
  let bestScore = -1;
  for (const tid of legal) {
    let score = 0;
    const t = player.tokens[tid];
    if (t.state === 'yard') score += 50;
    if (t.state === 'home') score += 30;
    if (t.state === 'track') {
      const nextPos = (t.track + state.dice) % 52;
      for (const op of state.players) {
        if (op.color === player.color) continue;
        if (op.tokens.some(ot => ot.state === 'track' && ot.track === nextPos && !SAFE.has(nextPos))) score += 40;
      }
    }
    if (score > bestScore) { bestScore = score; best = tid; }
  }
  return best;
}
