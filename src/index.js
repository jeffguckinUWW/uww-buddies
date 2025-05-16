// src/index.js - with error handling
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import NotificationService from './services/NotificationService';

// Add global error handler
window.addEventListener('error', function(event) {
  console.error('Global error:', event.message, event.filename, event.lineno);
});

// Safe initialization with fallback
try {
  console.log('Initializing React app...');
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    // React 18 approach
    try {
      console.log('Using React 18 createRoot...');
      const root = ReactDOM.createRoot(rootElement);
      root.render(<App />);
      console.log('React 18 rendering complete.');
    } catch (err) {
      console.error('Error with React 18 method:', err);
    }
  } else {
    console.error('Root element not found!');
    document.body.innerHTML = '<div style="padding:20px">Error: Root element not found</div>';
  }
} catch (err) {
  console.error('Critical initialization error:', err);
  document.body.innerHTML = '<div style="padding:20px">Critical error: ' + err.message + '</div>';
}

// Register the service worker for offline functionality
serviceWorkerRegistration.register();

// Initialize push notifications when on native platforms
if (typeof window !== 'undefined') {
  // Small delay to ensure app is fully initialized
  setTimeout(() => {
    NotificationService.initPushNotifications()
      .then(() => console.log('Push notifications initialized'))
      .catch(error => console.error('Error initializing push notifications:', error));
  }, 1000);
}