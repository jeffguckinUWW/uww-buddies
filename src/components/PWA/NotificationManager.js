// src/components/PWA/NotificationManager.js
import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationService from '../../services/NotificationService';

// Sound file - you can add a notification sound to public folder
const NOTIFICATION_SOUND = '/notification.mp3';

const NotificationManager = () => {
  const { user } = useAuth();
  const previousCountRef = useRef(0);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;

    if (!user) return;

    // Subscribe to unread counters
    const unsubscribe = NotificationService.subscribeToUnreadCounters(
      user.uid,
      (counters) => {
        const totalCount = counters.total || 0;

        // Update app badge (works on Android and iOS 16.4+ when PWA is installed)
        updateAppBadge(totalCount);

        // Update browser tab title
        updateTabTitle(totalCount);

        // Play sound if count increased
        if (totalCount > previousCountRef.current && previousCountRef.current > 0) {
          playNotificationSound();
        }

        previousCountRef.current = totalCount;
      }
    );

    return () => {
      unsubscribe();
      clearAppBadge();
    };
  }, [user]);

  const updateAppBadge = (count) => {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(err => {
          console.log('Badge API not supported or failed:', err);
        });
      } else {
        navigator.clearAppBadge().catch(err => {
          console.log('Clear badge failed:', err);
        });
      }
    }
  };

  const clearAppBadge = () => {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  };

  const updateTabTitle = (count) => {
    const baseTitle = 'UWW Buddies';
    if (count > 0) {
      document.title = `(${count}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  };

  const playNotificationSound = () => {
    // Only play if user has interacted with the page (browser autoplay policy)
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  };

  return null; // This component doesn't render anything
};

export default NotificationManager;
