import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

import { socket } from './socket.js';
import { SocketIOProvider } from './collab/SocketIOProvider.js';
import { createCursorStyleManager } from './collab/cursorStyles.js';

/**
 * Collaborative Monaco editor.
 *
 * On mount it builds the collaboration pipeline:
 *   Y.Doc  ──>  SocketIOProvider (network)  ──>  Awareness (cursors)
 *      └──>  Y.Text  ──MonacoBinding──>  Monaco model
 *
 * Every keystroke mutates the shared Y.Text; Yjs emits a CRDT update that the
 * provider relays to the room; remote peers apply it and Monaco re-renders.
 */
export default function CollabEditor({ roomId, user, language, onProviderReady }) {
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const docRef = useRef(null);
  const stylesRef = useRef(null);

  const handleMount = (editor, monaco) => {
    const doc = new Y.Doc();
    const provider = new SocketIOProvider(socket, roomId, doc);
    const yText = doc.getText('monaco');

    // Advertise who we are so peers can label our cursor.
    provider.setLocalUser(user);

    const styles = createCursorStyleManager(provider.awareness);

    const binding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness,
    );

    docRef.current = doc;
    providerRef.current = provider;
    bindingRef.current = binding;
    stylesRef.current = styles;

    onProviderReady?.(provider);
  };

  // Tear everything down on unmount to avoid leaks / duplicate listeners.
  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      stylesRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
    };
  }, []);

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={language}
      onMount={handleMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}
