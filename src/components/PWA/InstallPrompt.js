// src/components/PWA/InstallPrompt.js
import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Show prompt if not installed, not dismissed, or dismissed over 7 days ago
    if (!isInStandaloneMode && daysSinceDismissed > 7) {
      // For Android/Desktop - listen for beforeinstallprompt
      const handleBeforeInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // For iOS - show manual instructions after a delay
      if (iOS) {
        setTimeout(() => setShowPrompt(true), 3000);
      }

      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <button className="install-prompt-close" onClick={handleDismiss}>×</button>

        <div className="install-prompt-icon">📱</div>

        <h3>Install UWW Buddies</h3>
        <p>Get the full app experience with instant access from your home screen!</p>

        <ul className="install-benefits">
          <li>✓ Quick access from home screen</li>
          <li>✓ Full screen experience</li>
          <li>✓ Notification badges on app icon</li>
          <li>✓ Works offline</li>
        </ul>

        {isIOS ? (
          <div className="ios-instructions">
            <p><strong>To install:</strong></p>
            <ol>
              <li>Tap the <strong>Share</strong> button <span className="share-icon">⎘</span> in Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong></li>
            </ol>
          </div>
        ) : (
          <button className="install-button" onClick={handleInstall}>
            Install App
          </button>
        )}

        <button className="install-dismiss" onClick={handleDismiss}>
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
