/**
 * y-monaco's MonacoBinding renders each remote user's selection/caret as
 * Monaco decorations with the class names:
 *     .yRemoteSelection-<clientID>       (the highlighted selection range)
 *     .yRemoteSelectionHead-<clientID>   (the caret at the cursor head)
 * but it does NOT colour them — that's our job. This watches awareness and
 * keeps a single <style> element in sync with one colour rule per remote
 * client, plus a floating name label on each caret.
 */
export function createCursorStyleManager(awareness) {
  const styleEl = document.createElement('style');
  styleEl.id = 'yjs-remote-cursors';
  document.head.appendChild(styleEl);

  const render = () => {
    const rules = [];
    awareness.getStates().forEach((state, clientID) => {
      if (clientID === awareness.clientID) return; // skip ourselves
      const user = state.user;
      if (!user?.color) return;
      const color = user.color;
      const name = (user.name || 'anon').replace(/"/g, '');
      rules.push(`
        .yRemoteSelection-${clientID} {
          background-color: ${color}33;
        }
        .yRemoteSelectionHead-${clientID} {
          position: relative;
          border-left: ${color} solid 2px;
          box-sizing: border-box;
        }
        .yRemoteSelectionHead-${clientID}::after {
          content: "${name}";
          position: absolute;
          top: -1.4em;
          left: -2px;
          font-size: 11px;
          line-height: 1.2;
          padding: 0 4px;
          border-radius: 3px 3px 3px 0;
          white-space: nowrap;
          color: #fff;
          background-color: ${color};
          z-index: 10;
          pointer-events: none;
        }`);
    });
    styleEl.textContent = rules.join('\n');
  };

  render();
  awareness.on('change', render);

  return {
    destroy() {
      awareness.off('change', render);
      styleEl.remove();
    },
  };
}

// Deterministic, pleasant colour palette for user cursors.
const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080',
];

export function pickColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}
