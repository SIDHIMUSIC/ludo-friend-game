import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export default function App() {
  const [socket, setSocket] = useState(null)
  const [room, setRoom] = useState(null)
  const [state, setState] = useState(null)
  const [name, setName] = useState('Player')
  const [code, setCode] = useState('')
  const [bots, setBots] = useState(3)
  const [log, setLog] = useState([])

  useEffect(() => {
    const s = io(SERVER, { transports: ['websocket', 'polling'] })
    setSocket(s)
    s.on('roomCreated', d => { setRoom(d.code); setState(d.state); addLog('Room: ' + d.code) })
    s.on('joined', d => { setRoom(d.code); setState(d.state); addLog('Joined') })
    s.on('stateUpdate', d => setState(d.state))
    s.on('diceRolled', d => { setState(d.state); addLog((d.isBot?'Bot ':'') + 'Rolled ' + d.roll) })
    s.on('moved', d => { setState(d.state); addLog(d.isBot ? 'Bot moved' : 'Moved') })
    s.on('error', m => addLog('Error: ' + m))
    s.on('connect_error', () => addLog('Cannot connect to server. Start the backend first.'))
    return () => s.disconnect()
  }, [])

  const addLog = m => setLog(l => [...l.slice(-15), m])

  const create = () => {
    if (!socket) return
    socket.emit('createRoom', { name, withBots: Number(bots) })
  }
  const join = () => socket?.emit('joinRoom', { code: code.trim().toUpperCase(), name })
  const roll = () => room && socket?.emit('roll', { code: room })
  const move = (tokenId) => room && socket?.emit('move', { code: room, tokenId })

  if (!state) {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui', background: '#0f172a', color: '#fff', minHeight: '100vh', textAlign: 'center' }}>
        <h1 style={{ color: '#67e8f9' }}>🎲 Ludo Multiplayer</h1>
        <p style={{ opacity: 0.8 }}>Play with friends or bots</p>
        <div style={{ margin: '20px auto', maxWidth: 320 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            style={{ width: '100%', padding: 12, margin: '8px 0', borderRadius: 8, border: 'none' }} />
          <div style={{ margin: '12px 0' }}>
            <label>Bots: </label>
            <select value={bots} onChange={e => setBots(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
              <option value={0}>0 (friends only)</option>
              <option value={1}>1 bot</option>
              <option value={2}>2 bots</option>
              <option value={3}>3 bots</option>
            </select>
          </div>
          <button onClick={create} style={{ padding: '14px 28px', fontSize: 16, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, margin: 6, cursor: 'pointer' }}>
            Create Room {bots > 0 ? `(+${bots} bots)` : ''}
          </button>
          <hr style={{ margin: '20px 0', borderColor: '#334155' }} />
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter room code"
            style={{ width: '100%', padding: 12, margin: '8px 0', borderRadius: 8, border: 'none', textTransform: 'uppercase' }} />
          <button onClick={join} style={{ padding: '14px 28px', fontSize: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, margin: 6, cursor: 'pointer' }}>
            Join Room
          </button>
        </div>
        <div style={{ marginTop: 20, fontSize: 13, opacity: 0.7 }}>
          {log.map((l,i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    )
  }

  const currentPlayer = state.players[state.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === socket?.id && !currentPlayer?.isBot
  const myColor = state.players.find(p => p.id === socket?.id)?.color

  return (
    <div style={{ padding: 12, background: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div><strong>Room:</strong> {room}</div>
        <div style={{ color: currentPlayer?.color, fontWeight: 700 }}>{currentPlayer?.name}'s Turn</div>
      </div>
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <div style={{ fontSize: 48, background: '#fff', color: '#111', width: 80, height: 80, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          {state.dice || '🎲'}
        </div>
        {isMyTurn && <button onClick={roll} style={{ display: 'block', margin: '10px auto', padding: '12px 32px', fontSize: 16, background: '#f59e0b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Roll Dice</button>}
        {!isMyTurn && currentPlayer?.isBot && <div style={{ opacity: 0.7 }}>Bot is thinking...</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {state.players.map(p => (
          <div key={p.id} style={{ background: p.color + '33', padding: 10, borderRadius: 10, border: p.id === currentPlayer?.id ? '3px solid gold' : '1px solid #334155' }}>
            <div style={{ fontWeight: 700 }}>{p.name} {p.isBot ? '(Bot)' : ''} <span style={{ color: p.color }}>●</span></div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {p.tokens.map(t => {
                const can = isMyTurn && p.id === socket?.id && state.dice && (t.state === 'yard' ? state.dice === 6 : true)
                return (
                  <button key={t.id} onClick={() => can && move(t.id)} disabled={!can}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: p.color, color: '#fff', border: can ? '3px solid gold' : '2px solid white', cursor: can ? 'pointer' : 'default', fontWeight: 700, opacity: t.state === 'finished' ? 0.4 : 1 }}>
                    {t.id+1}
                  </button>
                )
              })}
            </div>
            <small>Home: {p.finished}/4</small>
          </div>
        ))}
      </div>

      {state.winner && (
        <div style={{ textAlign: 'center', marginTop: 20, padding: 20, background: '#16a34a', borderRadius: 12 }}>
          <h2>🎉 {state.players.find(p => p.color === state.winner)?.name} WINS! 🎉</h2>
          <button onClick={() => { setState(null); setRoom(null); }} style={{ marginTop: 10, padding: 10 }}>New Game</button>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, maxHeight: 80, overflow: 'auto', background: '#1e293b', padding: 8, borderRadius: 6 }}>
        {state.history?.slice(-6).map((h,i) => <div key={i}>{h}</div>)}
      </div>
    </div>
  )
}
