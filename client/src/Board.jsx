import { useEffect, useRef } from 'react'

const TRACK = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[7,0],[6,0]]
const HOME_LANES = {
  red: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
}
const YARD = {
  red: [[1,1],[1,4],[4,1],[4,4]],
  green: [[1,10],[1,13],[4,10],[4,13]],
  yellow: [[10,10],[10,13],[13,10],[13,13]],
  blue: [[10,1],[10,4],[13,1],[13,4]]
}
const SAFE = new Set([0,8,13,21,26,34,39,47])

export default function Board({ state, onMove, isMyTurn, myId }) {
  const cells = []
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      cells.push({ r, c })
    }
  }

  function getTokenAt(r, c) {
    if (!state) return null
    for (const p of state.players) {
      for (const t of p.tokens) {
        let pos = null
        if (t.state === 'yard') pos = YARD[p.color][t.id]
        else if (t.state === 'track') pos = TRACK[t.track]
        else if (t.state === 'home') pos = HOME_LANES[p.color][t.home]
        if (pos && pos[0] === r && pos[1] === c) {
          return { ...t, color: p.color, playerId: p.id, name: p.name }
        }
      }
    }
    return null
  }

  function cellClass(r, c) {
    let cls = 'cell'
    if (HOME_LANES.red.some(p => p[0]===r && p[1]===c)) cls += ' red-path'
    if (HOME_LANES.green.some(p => p[0]===r && p[1]===c)) cls += ' green-path'
    if (HOME_LANES.yellow.some(p => p[0]===r && p[1]===c)) cls += ' yellow-path'
    if (HOME_LANES.blue.some(p => p[0]===r && p[1]===c)) cls += ' blue-path'
    if (r>=6 && r<=8 && c>=6 && c<=8) cls += ' center'
    const ti = TRACK.findIndex(p => p[0]===r && p[1]===c)
    if (ti >= 0 && SAFE.has(ti)) cls += ' safe'
    return cls
  }

  return (
    <div className="board-container">
      <div className="board">
        {cells.map(({r, c}) => {
          const token = getTokenAt(r, c)
          const canMove = isMyTurn && token && token.playerId === myId && state.dice
          return (
            <div key={`${r}-${c}`} className={cellClass(r, c)}>
              {token && (
                <div
                  className={`token ${token.color} ${canMove ? 'can-move' : ''}`}
                  onClick={() => canMove && onMove(token.id)}
                  title={token.name}
                >
                  {token.id + 1}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <style>{`
        .board-container { width: min(92vw, 480px); margin: 10px auto; }
        .board { display: grid; grid-template-columns: repeat(15, 1fr); aspect-ratio: 1; background: #f8f1e3; border: 4px solid #334155; border-radius: 8px; }
        .cell { border: 0.5px solid #e5e7eb; position: relative; }
        .cell.safe { background: #fef08a !important; }
        .cell.red-path { background: #fecaca; }
        .cell.green-path { background: #bbf7d0; }
        .cell.yellow-path { background: #fef08a; }
        .cell.blue-path { background: #bfdbfe; }
        .cell.center { background: #1e293b; }
        .token { position: absolute; width: 70%; height: 70%; top: 15%; left: 15%; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: transform 0.15s; }
        .token.red { background: #dc2626; color: white; }
        .token.green { background: #16a34a; color: white; }
        .token.yellow { background: #eab308; color: #111; }
        .token.blue { background: #2563eb; color: white; }
        .token.can-move { outline: 3px solid gold; transform: scale(1.15); z-index: 10; }
      `}</style>
    </div>
  )
}
