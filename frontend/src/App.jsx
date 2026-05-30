import { useEffect, useState } from 'react';
import { socket } from './socket.js';
import { pickColor } from './collab/cursorStyles.js';
import Workspace from './Workspace.jsx';

// Small inline logo mark (linked nodes — "collaboration").
function LogoMark() {
  return (
    <span className="mark">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="18" cy="6" r="2.4" />
        <circle cx="12" cy="18" r="2.4" />
        <path d="M7.6 7.6 10.4 16M16.4 7.6 13.6 16M8 6h8" />
      </svg>
    </span>
  );
}

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [session, setSession] = useState(null); // { roomId, user, members }

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Prefill the room from a share link (?room=abc123).
    const fromUrl = new URLSearchParams(location.search).get('room');
    if (fromUrl) setRoomId(fromUrl);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const join = () => {
    const finalRoom = roomId.trim() || Math.random().toString(36).slice(2, 8);
    const user = { name: name.trim() || 'Anonymous', color: pickColor() };
    socket.emit('room:join', { roomId: finalRoom, user }, (res) => {
      if (res?.error) return alert(res.error);
      setSession({ roomId: finalRoom, user, members: res.members || [] });
    });
  };

  if (session) {
    return <Workspace session={session} connected={connected} onLeave={() => setSession(null)} />;
  }

  return (
    <div className="landing">
      <div className="brand">
        <div className="brand-logo">
          <LogoMark />
          <span>CollabEdit</span>
        </div>
        <h1>
          Code together, <span className="accent">in real time.</span>
        </h1>
        <p className="tagline">
          A multi-user code editor where everyone edits the same document live —
          conflict-free, with shared cursors, chat, and presence. Like Google Docs,
          but for code.
        </p>
        <div className="features">
          <div className="feature"><span className="tick">✓</span> Conflict-free concurrent editing (CRDT)</div>
          <div className="feature"><span className="tick">✓</span> Live cursors, chat &amp; presence</div>
          <div className="feature"><span className="tick">✓</span> Run code in 8 languages, 13+ for editing</div>
        </div>
      </div>

      <div className="join-card">
        <h2>Join a room</h2>
        <p className="sub">Enter a name and a room to start collaborating.</p>
        <div className="field">
          <label>Your name</label>
          <input placeholder="e.g. Utkarsh" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Room ID</label>
          <input
            placeholder="Leave blank to create a new room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
          />
        </div>
        <button onClick={join}>Join room →</button>
        <button className="link-btn" onClick={() => setRoomId(Math.random().toString(36).slice(2, 8))}>
          Generate a unique room ID
        </button>
        <div className="status">
          <span className={`dot ${connected ? 'connected' : ''}`} />
          {connected ? 'Backend connected' : 'Connecting to backend…'}
        </div>
      </div>
    </div>
  );
}
