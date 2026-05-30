import ReactDOM from 'react-dom/client';
import './monacoSetup.js'; // must run before any Monaco editor mounts
import App from './App.jsx';
import './index.css';

// Note: intentionally NOT wrapped in <React.StrictMode>. StrictMode double-
// invokes effects in development, which would build the Yjs/Monaco binding
// twice and attach duplicate socket listeners. Collaboration code is stateful
// and long-lived, so we mount it exactly once.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
