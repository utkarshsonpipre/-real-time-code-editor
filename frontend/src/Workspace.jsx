import { useEffect, useRef, useState } from 'react';
import { socket } from './socket.js';
import { LANGUAGES } from './monacoSetup.js';
import { runCode, RUNNABLE } from './runner.js';
import CollabEditor from './Editor.jsx';
import * as Icons from './icons.jsx';

const EXT = {
  javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp',
  csharp: 'cs', go: 'go', rust: 'rs', html: 'html', css: 'css', json: 'json',
  markdown: 'md', sql: 'sql',
};
const fileName = (lang) => `main.${EXT[lang] || 'txt'}`;
const initials = (n) => (n || '?').trim().slice(0, 1).toUpperCase();

const THEMES = [
  { id: 'vs-dark', label: 'VS Dark' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'hc-black', label: 'High Contrast' },
  { id: 'vs', label: 'Light' },
];
const FONTS = [
  { id: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { id: "'Fira Code', monospace", label: 'Fira Code' },
  { id: "'Space Mono', monospace", label: 'Space Mono' },
  { id: 'Consolas, monospace', label: 'Consolas' },
];
const DEFAULTS = { theme: 'vs-dark', fontSize: 14, fontFamily: FONTS[0].id, language: 'javascript' };

const NAV = [
  { id: 'files', title: 'Files', Icon: Icons.Files },
  { id: 'chat', title: 'Group Chat', Icon: Icons.Chat },
  { id: 'run', title: 'Run', Icon: Icons.Run },
  { id: 'users', title: 'Users', Icon: Icons.Users },
  { id: 'settings', title: 'Settings', Icon: Icons.Settings },
];

export default function Workspace({ session, connected, onLeave }) {
  const { roomId, user } = session;
  const editorRef = useRef(null);

  const [active, setActive] = useState('files');
  const [members, setMembers] = useState(session.members || []);
  const [settings, setSettings] = useState(DEFAULTS);

  // chat
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const chatEndRef = useRef(null);

  // run
  const [run, setRun] = useState({ loading: false, output: '', ok: true });

  // --- socket wiring -------------------------------------------------------
  useEffect(() => {
    const onPresence = ({ members }) => setMembers(members);
    const onChat = (msg) => setMessages((m) => [...m, msg]);
    socket.on('presence:update', onPresence);
    socket.on('chat:message', onChat);
    return () => {
      socket.off('presence:update', onPresence);
      socket.off('chat:message', onChat);
    };
  }, []);

  // unread badge + autoscroll
  useEffect(() => {
    if (active !== 'chat' && messages.length) setUnread((u) => u + 1);
  }, [messages.length]); // eslint-disable-line
  useEffect(() => {
    if (active === 'chat') {
      setUnread(0);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [active, messages.length]);

  // live-apply font settings to the editor
  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize: settings.fontSize, fontFamily: settings.fontFamily });
  }, [settings.fontSize, settings.fontFamily]);

  // --- actions -------------------------------------------------------------
  const sendChat = () => {
    const text = draft.trim();
    if (!text) return;
    socket.emit('chat:message', { roomId, text });
    setDraft('');
  };

  const doRun = async () => {
    setActive('run');
    setRun({ loading: true, output: '', ok: true });
    const source = editorRef.current?.getValue() ?? '';
    const result = await runCode(settings.language, source);
    setRun({ loading: false, output: result.output, ok: result.ok });
  };

  const download = () => {
    const content = editorRef.current?.getValue() ?? '';
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName(settings.language);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => editorRef.current?.setValue(String(reader.result));
    reader.readAsText(file);
    e.target.value = '';
  };

  const copyRoom = () => navigator.clipboard?.writeText(roomId);
  const shareLink = () => navigator.clipboard?.writeText(`${location.origin}?room=${roomId}`);
  const leave = () => {
    socket.emit('room:leave', { roomId });
    onLeave();
  };

  return (
    <div className="ide">
      {/* Activity bar */}
      <nav className="activity-bar">
        <div className="ab-top">
          {NAV.map(({ id, title, Icon }) => (
            <button
              key={id}
              className={`ab-btn ${active === id ? 'active' : ''}`}
              title={title}
              onClick={() => setActive(id)}
            >
              <Icon />
              {id === 'chat' && unread > 0 && <span className="ab-badge">{unread}</span>}
            </button>
          ))}
        </div>
        <div className="ab-bottom">
          <span className={`dot ${connected ? 'connected' : ''}`} title={connected ? 'connected' : 'offline'} />
        </div>
      </nav>

      {/* Side panel */}
      <aside className="panel">
        {active === 'files' && (
          <FilesPanel language={settings.language} onDownload={download} onOpen={openFile} />
        )}
        {active === 'chat' && (
          <ChatPanel
            messages={messages}
            draft={draft}
            setDraft={setDraft}
            onSend={sendChat}
            chatEndRef={chatEndRef}
          />
        )}
        {active === 'run' && <RunPanel run={run} onRun={doRun} canRun={RUNNABLE.has(settings.language)} />}
        {active === 'users' && (
          <UsersPanel members={members} meId={socket.id} onShare={shareLink} onCopy={copyRoom} onLeave={leave} />
        )}
        {active === 'settings' && (
          <SettingsPanel settings={settings} setSettings={setSettings} onReset={() => setSettings(DEFAULTS)} />
        )}
      </aside>

      {/* Editor */}
      <main className="editor-area">
        <div className="tabbar">
          <div className="tab active">
            <span className="tab-badge">{(EXT[settings.language] || 'txt').toUpperCase()}</span>
            {fileName(settings.language)}
            <span className="tab-x">×</span>
          </div>
          <div className="tabbar-actions">
            <span className="room-pill" title="Click to copy" onClick={copyRoom}>
              room: {roomId}
            </span>
            <button className="run-btn" onClick={doRun} title="Run code">
              <Icons.Run /> Run
            </button>
          </div>
        </div>
        <div className="editor-host">
          <CollabEditor
            roomId={roomId}
            user={user}
            language={settings.language}
            theme={settings.theme}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            editorRef={editorRef}
          />
        </div>
      </main>
    </div>
  );
}

/* ------------------------------- Panels -------------------------------- */

function PanelHeader({ children }) {
  return <h2 className="panel-title">{children}</h2>;
}

function FilesPanel({ language, onDownload, onOpen }) {
  const fileInput = useRef(null);
  return (
    <div className="panel-body">
      <div className="panel-head-row">
        <PanelHeader>Files</PanelHeader>
        <div className="head-actions">
          <button className="icon-btn" title="Open file" onClick={() => fileInput.current?.click()}>
            <Icons.Upload />
          </button>
        </div>
      </div>
      <div className="file-row active">
        <span className="tab-badge sm">{(language && language.slice(0, 2).toUpperCase()) || 'JS'}</span>
        {fileName(language)}
      </div>
      <div className="panel-foot">
        <button className="wide-btn" onClick={() => fileInput.current?.click()}>
          <Icons.Upload /> Open File
        </button>
        <button className="wide-btn" onClick={onDownload}>
          <Icons.Download /> Download Code
        </button>
      </div>
      <input ref={fileInput} type="file" hidden onChange={onOpen} />
    </div>
  );
}

function ChatPanel({ messages, draft, setDraft, onSend, chatEndRef }) {
  return (
    <div className="panel-body chat">
      <PanelHeader>Group Chat</PanelHeader>
      <div className="chat-scroll">
        {messages.length === 0 && <p className="empty">No messages yet. Say hi 👋</p>}
        {messages.map((m) => (
          <div className="chat-msg" key={m.id}>
            <span className="chat-name" style={{ color: m.color }}>
              {m.socketId === socket.id ? 'You' : m.name}
            </span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="chat-input">
        <input
          placeholder="Enter a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
        />
        <button onClick={onSend} title="Send">
          <Icons.Send />
        </button>
      </div>
    </div>
  );
}

function RunPanel({ run, onRun, canRun }) {
  return (
    <div className="panel-body">
      <PanelHeader>Run</PanelHeader>
      <button className="wide-btn primary" onClick={onRun} disabled={run.loading}>
        {run.loading ? 'Running…' : '▶ Run code'}
      </button>
      {!canRun && <p className="empty">This language is edit-only (not executable).</p>}
      <div className={`run-output ${run.ok ? '' : 'err'}`}>
        {run.output || 'Output will appear here.'}
      </div>
    </div>
  );
}

function UsersPanel({ members, meId, onShare, onCopy, onLeave }) {
  return (
    <div className="panel-body">
      <PanelHeader>Users</PanelHeader>
      <div className="user-grid">
        {members.map((m) => (
          <div className="user-cell" key={m.socketId}>
            <div className="user-avatar" style={{ background: m.color || '#6366f1' }}>
              {initials(m.name)}
              <span className="online" />
            </div>
            <span className="user-name">{m.socketId === meId ? `${m.name} (you)` : m.name}</span>
          </div>
        ))}
      </div>
      <div className="panel-foot row">
        <button className="square-btn" title="Copy share link" onClick={onShare}>
          <Icons.Share />
        </button>
        <button className="square-btn" title="Copy room ID" onClick={onCopy}>
          <Icons.Copy />
        </button>
        <button className="square-btn leave" title="Leave room" onClick={onLeave}>
          <Icons.Leave />
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, setSettings, onReset }) {
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  return (
    <div className="panel-body">
      <PanelHeader>Settings</PanelHeader>

      <label className="set-label">Font Family</label>
      <div className="set-row">
        <select value={settings.fontFamily} onChange={(e) => set('fontFamily', e.target.value)}>
          {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <input
          type="number"
          min="10"
          max="28"
          className="set-size"
          value={settings.fontSize}
          onChange={(e) => set('fontSize', Number(e.target.value))}
        />
      </div>

      <label className="set-label">Theme</label>
      <select value={settings.theme} onChange={(e) => set('theme', e.target.value)}>
        {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      <label className="set-label">Language</label>
      <select value={settings.language} onChange={(e) => set('language', e.target.value)}>
        {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <div className="panel-foot">
        <button className="wide-btn" onClick={onReset}>Reset to default</button>
      </div>
    </div>
  );
}

