import { useEffect, useState } from 'react';
import { socket } from './socket.js';
import { LANGUAGES } from './monacoSetup.js';
import { pickColor } from './collab/cursorStyles.js';
import CollabEditor from './Editor.jsx';

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

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [session, setSession] = useState(null); // { roomId, user }
  const [members, setMembers] = useState([]);
  const [language, setLanguage] = useState('javascript');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onPresence = ({ members }) => setMembers(members);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('presence:update', onPresence);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence:update', onPresence);
    };
  }, []);

  const join = () => {
    const finalRoom = roomId.trim() || Math.random().toString(36).slice(2, 8);
    const user = { name: name.trim() || 'Anonymous', color: pickColor() };
    socket.emit('room:join', { roomId: finalRoom, user }, (res) => {
      if (res?.error) return alert(res.error);
      setMembers(res.members || []);
      setSession({ roomId: finalRoom, user });
    });
  };

  const leave = () => {
    if (session) socket.emit('room:leave', { roomId: session.roomId });
    setSession(null);
    setMembers([]);
  };

  const copyRoom = () => {
    navigator.clipboard?.writeText(session.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ---------- Landing / lobby ----------
  if (!session) {
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
            conflict-free, with shared cursors and presence. Just like Google Docs,
            but for code.
          </p>
          <div className="features">
            <div className="feature">
              <span className="tick">✓</span> Conflict-free concurrent editing (CRDT)
            </div>
            <div className="feature">
              <span className="tick">✓</span> Live cursors &amp; presence tracking
            </div>
            <div className="feature">
              <span className="tick">✓</span> Syntax highlighting for 13+ languages
            </div>
          </div>
        </div>

        <div className="join-card">
          <h2>Join a room</h2>
          <p className="sub">Enter a name and a room to start collaborating.</p>
          <div className="field">
            <label>Your name</label>
            <input
              placeholder="e.g. Utkarsh"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
          <button
            className="link-btn"
            onClick={() => setRoomId(Math.random().toString(36).slice(2, 8))}
          >
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

  // ---------- Editor workspace ----------
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-logo">
            <LogoMark />
            <span>CollabEdit</span>
          </div>
          <button className="room-chip" onClick={copyRoom} title="Click to copy room ID">
            <span className="label">Room</span>
            <strong>{session.roomId}</strong>
            <span className={copied ? 'copied' : ''}>{copied ? '✓ copied' : '⧉'}</span>
          </button>
          <span className={`dot ${connected ? 'connected' : ''}`} title={connected ? 'connected' : 'disconnected'} />
        </div>
        <div className="topbar-right">
          <div className="lang-select">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button className="ghost" onClick={leave}>
            Leave
          </button>
        </div>
      </header>

      <div className="workspace">
        <main className="editor-pane">
          <CollabEditor roomId={session.roomId} user={session.user} language={language} />
        </main>
        <aside className="sidebar">
          <h3>Present · {members.length}</h3>
          <ul className="member-list">
            {members.map((m) => (
              <li className="member" key={m.socketId}>
                <span className="avatar" style={{ background: m.color || '#6366f1' }}>
                  {initials(m.name)}
                </span>
                <span>{m.name}</span>
                {m.socketId === socket.id && <span className="you">you</span>}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
