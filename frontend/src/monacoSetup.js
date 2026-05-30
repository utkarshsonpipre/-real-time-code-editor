// Monaco + Vite wiring.
//
// Two things happen here:
//  1. We register Monaco's web workers the way Vite expects (via `?worker`
//     imports). Without this Monaco logs "could not create web worker" and
//     language features (syntax/intellisense) silently degrade.
//  2. We point @monaco-editor/react's loader at THIS bundled `monaco`
//     instance instead of its default CDN download. Critical: y-monaco
//     imports `monaco-editor` directly, so the editor and the Yjs binding
//     must share one and the same Monaco instance.
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

// Languages offered in the editor's language picker.
export const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'csharp',
  'go',
  'rust',
  'html',
  'css',
  'json',
  'markdown',
  'sql',
];
