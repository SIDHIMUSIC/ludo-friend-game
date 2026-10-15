// Authentic Ludo rules engine (server-authoritative)

export const COLORS = ['red', 'green', 'yellow', 'blue'];
export const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };
export const TURN_POINT = { red: 50, green: 11, yellow: 24, blue: 37 };
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function createGameState(players) {
  const state = {
    players: players.map(p => ({
      id: p.id,
      color: p.color,
      name: p.name || p.color,
      tokens: [0,1,2,3].map(i => ({ id: i, state: 'yard', track: -1, home: -1 })),
      finished: 0
    })),
    currentPlayerIndex: 0,
    dice: null,
    sixes: 0,
    winner: null,
    history: []
  };
  return state;
}

export function rollDice(state, forcedColor = null) {
  if (state.winner || state.dice) return null;
  const current = state.players[state.currentPlayerIndex];
  let roll;
  if (forcedColor && forcedColor === current.color) {
    roll = Math.random() < 0.75 ? 6 : Math.floor(Math.random() * 5) + 1;
  } else if (forcedColor) {
    roll = Math.floor(Math.random() * 3) + 1;
  } else {
    roll = Math.floor(Math.random() * 6) + 1;
  }
  state.dice = roll;
  if (roll === 6) state.sixes++;
  else state.sixes = 0;
  if (state.sixes >= 3) {
    state.history.push(`${current.color} rolled 3 sixes — turn skipped`);
    nextTurn(state);
    return roll;
  }
  return roll;
}

export function canMove(state, playerIndex, tokenId) {
  if (state.winner || !state.dice) return false;
  const player = state.players[playerIndex];
  const token = player.tokens[tokenId];
  if (token.state === 'finished') return false;
  if (token.state === 'yard') return state.dice === 6;
  if (token.state === 'track') {
    const next = token.track + state.dice;
    const turn = TURN_POINT[player.color];
    if (token.track <= turn && next > turn) {
      return (next - turn - 1) < 6;
    }
    return true;
  }
  if (token.state === 'home') {
    return token.home + state.dice <= 5;
  }
  return false;
}

export function moveToken(state, playerIndex, tokenId) {
  if (!canMove(state, playerIndex, tokenId)) return false;
  const player = state.players[playerIndex];
  const token = player.tokens[tokenId];
  const dice = state.dice;

  if (token.state === 'yard') {
    token.state = 'track';
    token.track = START_INDEX[player.color];
    state.history.push(`${player.color} token entered`);
  } else if (token.state === 'track') {
    const old = token.track;
    const next = old + dice;
    const turn = TURN_POINT[player.color];
    if (old <= turn && next > turn) {
      const into = next - turn - 1;
      if (into < 6) {
        token.state = 'home';
        token.home = into;
        state.history.push(`${player.color} entered home`);
      }
    } else {
      token.track = next % 52;
      // Capture
      state.players.forEach(op => {
        if (op.color === player.color) return;
        op.tokens.forEach(ot => {
          if (ot.state === 'track' && ot.track === token.track && !SAFE.has(token.track)) {
            ot.state = 'yard';
            ot.track = -1;
            state.history.push(`${player.color} captured ${op.color}`);
          }
        });
      });
    }
  } else if (token.state === 'home') {
    const nh = token.home + dice;
    if (nh === 5) {
      token.state = 'finished';
      player.finished++;
      state.history.push(`${player.color} token finished`);
      if (player.finished === 4) {
        state.winner = player.color;
        state.history.push(`${player.color} WINS!`);
      }
    } else if (nh < 6) {
      token.home = nh;
    }
  }

  if (dice === 6 && !state.winner) {
    state.dice = null; // extra turn
  } else {
    nextTurn(state);
  }
  return true;
}

function nextTurn(state) {
  state.dice = null;
  state.sixes = 0;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
}

export function getLegalMoves(state, playerIndex) {
  return state.players[playerIndex].tokens
    .map((_, i) => i)
    .filter(i => canMove(state, playerIndex, i));
}
