// src/index.js - Updated
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <div className="no-tap-highlight smooth-scroll no-overscroll">
      <App />
    </div>
  </React.StrictMode>
);

// Register the service worker for offline functionality
serviceWorkerRegistration.register();