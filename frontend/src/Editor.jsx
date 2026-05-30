import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

import { socket } from './socket.js';
import { SocketIOProvider } from './collab/SocketIOProvider.js';
import { createCursorStyleManager } from './collab/cursorStyles.js';

// Custom Monaco themes offered in Settings (built-ins: vs-dark, vs, hc-black).
function defineThemes(monaco) {
  monaco.editor.defineTheme('dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#6272a4',
      'editor.lineHighlightBackground': '#44475a55',
    },
  });
  monaco.editor.defineTheme('midnight', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a0e1a',
      'editorLineNumber.foreground': '#3a4663',
    },
  });
}

/**
 * Collaborative Monaco editor.
 *
 * Collaboration pipeline (unchanged):
 *   Y.Doc -> SocketIOProvider (network) -> Awareness (cursors)
 *      └-> Y.Text -> MonacoBinding -> Monaco model
 */
export default function CollabEditor({
  roomId,
  user,
  language,
  theme = 'vs-dark',
  fontSize = 14,
  fontFamily = "'JetBrains Mono', monospace",
  editorRef,
}) {
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const docRef = useRef(null);
  const stylesRef = useRef(null);

  const handleMount = (editor, monaco) => {
    const doc = new Y.Doc();
    const provider = new SocketIOProvider(socket, roomId, doc);
    const yText = doc.getText('monaco');

    provider.setLocalUser(user);
    const styles = createCursorStyleManager(provider.awareness);
    const binding = new MonacoBinding(yText, editor.getModel(), new Set([editor]), provider.awareness);

    docRef.current = doc;
    providerRef.current = provider;
    bindingRef.current = binding;
    stylesRef.current = styles;

    // Expose the editor instance to the parent (for Run / Download).
    if (editorRef) editorRef.current = editor;
  };

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      stylesRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
      if (editorRef) editorRef.current = null;
    };
  }, []);

  return (
    <Editor
      height="100%"
      theme={theme}
      language={language}
      beforeMount={defineThemes}
      onMount={handleMount}
      options={{
        fontSize,
        fontFamily,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        smoothScrolling: true,
      }}
    />
  );
}
