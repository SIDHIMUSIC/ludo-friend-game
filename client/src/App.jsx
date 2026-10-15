import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export default function App() {
  const [socket, setSocket] = useState(null)
  const [room, setRoom] = useState(null)
  const [state, setState] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [log, setLog] = useState([])

  useEffect(() => {
    const s = io(SERVER)
    setSocket(s)
    s.on('roomCreated', d => { setRoom(d.code); setState(d.state); addLog('Room created: ' + d.code) })
    s.on('joined', d => { setRoom(d.code); setState(d.state); addLog('Joined room') })
    s.on('playerJoined', d => { setState(d.state); addLog('Player joined') })
    s.on('diceRolled', d => { setState(d.state); addLog('Rolled ' + d.roll) })
    s.on('moved', d => { setState(d.state); addLog('Moved') })
    s.on('error', m => addLog('Error: ' + m))
    return () => s.disconnect()
  }, [])

  const addLog = m => setLog(l => [...l.slice(-20), m])

  const create = () => socket?.emit('createRoom', { name: name || 'Player' })
  const join = () => socket?.emit('joinRoom', { code, name: name || 'Player' })
  const roll = () => room && socket?.emit('roll', { code: room })
  const move = (tokenId) => room && socket?.emit('move', { code: room, tokenId })

  if (!state) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', background: '#0f172a', color: '#fff', minHeight: '100vh' }}>
        <h1>Ludo Multiplayer</h1>
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ margin: 8, padding: 8 }} />
        <br />
        <button onClick={create} style={{ padding: 10, margin: 8 }}>Create Room</button>
        <br />
        <input placeholder="Room code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{ margin: 8, padding: 8 }} />
        <button onClick={join} style={{ padding: 10, margin: 8 }}>Join Room</button>
        <div>{log.map((l,i) => <div key={i}>{l}</div>)}</div>
      </div>
    )
  }

  const me = state.players.find(p => p.id === socket?.id)
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === socket?.id

  return (
    <div style={{ padding: 12, background: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Room: {room} | Turn: {state.players[state.currentPlayerIndex]?.color?.toUpperCase()}</h2>
      <p>Dice: {state.dice || '-'}</p>
      {isMyTurn && <button onClick={roll} style={{ padding: 12, fontSize: 18, margin: 8 }}>Roll Dice</button>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 16 }}>
        {state.players.map(p => (
          <div key={p.id} style={{ background: '#1e293b', padding: 12, borderRadius: 8 }}>
            <strong style={{ color: p.color }}>{p.name} ({p.color})</strong>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {p.tokens.map(t => (
                <button key={t.id} onClick={() => isMyTurn && move(t.id)}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: p.color, color: '#fff', border: '2px solid white', cursor: isMyTurn ? 'pointer' : 'default' }}>
                  {t.id+1}
                </button>
              ))}
            </div>
            <small>Finished: {p.finished}/4</small>
          </div>
        ))}
      </div>
      {state.winner && <h2 style={{ color: 'gold' }}>{state.winner.toUpperCase()} WINS!</h2>}
      <div style={{ marginTop: 16, fontSize: 12, maxHeight: 100, overflow: 'auto' }}>
        {state.history?.slice(-8).map((h,i) => <div key={i}>{h}</div>)}
      </div>
    </div>
  )
}
