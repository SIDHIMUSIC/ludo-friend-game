import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Board from './Board.jsx'

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
    s.on('roomCreated', d => { setRoom(d.code); setState(d.state); addLog('Room created: ' + d.code) })
    s.on('joined', d => { setRoom(d.code); setState(d.state); addLog('Joined room') })
    s.on('stateUpdate', d => setState(d.state))
    s.on('diceRolled', d => { setState(d.state); addLog((d.isBot ? 'Bot ' : '') + 'rolled ' + d.roll) })
    s.on('moved', d => { setState(d.state); addLog(d.isBot ? 'Bot moved' : 'Token moved') })
    s.on('error', m => addLog('Error: ' + m))
    s.on('connect_error', () => addLog('Server not reachable. Check VITE_SERVER_URL'))
    return () => s.disconnect()
  }, [])

  const addLog = m => setLog(l => [...l.slice(-12), m])

  const create = () => socket?.emit('createRoom', { name, withBots: Number(bots) })
  const join = () => socket?.emit('joinRoom', { code: code.trim().toUpperCase(), name })
  const roll = () => room && socket?.emit('roll', { code: room })
  const move = (tokenId) => room && socket?.emit('move', { code: room, tokenId })

  if (!state) {
    return (
      <div style={{ padding: 20, fontFamily: 'system-ui', background: '#0f172a', color: '#fff', minHeight: '100vh', textAlign: 'center' }}>
        <h1 style={{ color: '#67e8f9' }}>🎲 Ludo Multiplayer</h1>
        <p>Play with friends or bots</p>
        <div style={{ maxWidth: 340, margin: '20px auto' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            style={{ width: '100%', padding: 12, margin: '8px 0', borderRadius: 8, border: 'none', fontSize: 16 }} />
          <div style={{ margin: '10px 0' }}>
            Bots:&nbsp;
            <select value={bots} onChange={e => setBots(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
              <option value={0}>Friends only</option>
              <option value={1}>1 Bot</option>
              <option value={2}>2 Bots</option>
              <option value={3}>3 Bots</option>
            </select>
          </div>
          <button onClick={create} style={{ padding: '14px 24px', fontSize: 16, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, margin: 6, cursor: 'pointer', fontWeight: 700 }}>
            Create Room
          </button>
          <hr style={{ margin: '18px 0', borderColor: '#334155' }} />
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Room code"
            style={{ width: '100%', padding: 12, margin: '8px 0', borderRadius: 8, border: 'none', fontSize: 16, textTransform: 'uppercase' }} />
          <button onClick={join} style={{ padding: '14px 24px', fontSize: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, margin: 6, cursor: 'pointer', fontWeight: 700 }}>
            Join Room
          </button>
        </div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 16 }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    )
  }

  const current = state.players[state.currentPlayerIndex]
  const isMyTurn = current?.id === socket?.id && !current?.isBot

  return (
    <div style={{ padding: 10, background: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span><b>Room:</b> {room}</span>
        <span style={{ color: current?.color, fontWeight: 700 }}>{current?.name}'s Turn</span>
      </div>

      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div style={{ fontSize: 42, background: '#fff', color: '#111', width: 72, height: 72, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          {state.dice || '🎲'}
        </div>
        {isMyTurn && (
          <button onClick={roll} style={{ display: 'block', margin: '8px auto', padding: '10px 28px', fontSize: 15, background: '#f59e0b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            Roll Dice
          </button>
        )}
        {current?.isBot && <div style={{ opacity: 0.7, fontSize: 13 }}>Bot thinking...</div>}
      </div>

      <Board state={state} onMove={move} isMyTurn={isMyTurn} myId={socket?.id} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {state.players.map(p => (
          <div key={p.id} style={{ background: '#1e293b', padding: '6px 10px', borderRadius: 8, fontSize: 12, border: p.id === current?.id ? '2px solid gold' : '1px solid #334155' }}>
            <span style={{ color: p.color }}>●</span> {p.name} {p.isBot ? '(Bot)' : ''} — {p.finished}/4
          </div>
        ))}
      </div>

      {state.winner && (
        <div style={{ textAlign: 'center', marginTop: 16, padding: 16, background: '#16a34a', borderRadius: 12 }}>
          <h2>🎉 {state.players.find(p => p.color === state.winner)?.name} WINS! 🎉</h2>
          <button onClick={() => { setState(null); setRoom(null) }} style={{ marginTop: 8, padding: 8 }}>Play Again</button>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, maxHeight: 60, overflow: 'auto', background: '#1e293b', padding: 6, borderRadius: 6 }}>
        {state.history?.slice(-5).map((h, i) => <div key={i}>{h}</div>)}
      </div>
    </div>
  )
}
