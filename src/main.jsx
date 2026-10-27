import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupWebBridgeIfNeeded } from './utils/webClientBridge';

// Initialize web bridge for browser access if outside Electron
setupWebBridgeIfNeeded();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
