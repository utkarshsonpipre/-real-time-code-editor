import { useEffect, useState } from 'react';
import { socket } from './socket.js';
import { LANGUAGES } from './monacoSetup.js';
import { pickColor } from './collab/cursorStyles.js';
import CollabEditor from './Editor.jsx';

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [session, setSession] = useState(null); // { roomId, user }
  const [members, setMembers] = useState([]);
  const [language, setLanguage] = useState('javascript');

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

  if (!session) {
    return (
      <div className="lobby">
        <h1>Collaborative Code Editor</h1>
        <p>Join a room to start editing together in real time.</p>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Room ID (leave blank to create one)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button onClick={join}>Join room</button>
        <p className="status">
          <span className={`dot ${connected ? 'connected' : ''}`} />
          backend {connected ? 'connected' : 'offline'}
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <strong>Room</strong>
          <code
            className="room-id"
            title="Click to copy"
            onClick={() => navigator.clipboard?.writeText(session.roomId)}
          >
            {session.roomId}
          </code>
          <span className={`dot ${connected ? 'connected' : ''}`} />
        </div>
        <div className="topbar-right">
          <label>
            Language{' '}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary" onClick={leave}>
            Leave
          </button>
        </div>
      </header>

      <div className="workspace">
        <main className="editor-pane">
          <CollabEditor
            roomId={session.roomId}
            user={session.user}
            language={language}
          />
        </main>
        <aside className="sidebar">
          <h3>Present ({members.length})</h3>
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.socketId}>
                <span
                  className="member-dot"
                  style={{ background: m.color || '#888' }}
                />
                {m.name}
                {m.socketId === socket.id && ' (you)'}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
