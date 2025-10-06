// src/components/PWA/ToastNotification.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationService from '../../services/NotificationService';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import './ToastNotification.css';

const ToastNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  const subscribeToNewNotifications = React.useCallback(() => {
    if (!user) return;

    // Listen to the most recent notification
    const q = query(
      collection(db, 'notifications'),
      where('toUser', '==', user.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    let lastNotificationId = null;

    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() };

          // Prevent showing the same notification twice
          if (notification.id !== lastNotificationId) {
            lastNotificationId = notification.id;
            showToast(notification);
          }
        }
      });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen for new notifications
    const unsubscribe = NotificationService.subscribeToUnreadCounters(
      user.uid,
      (counters) => {
        // This will trigger when counters update
        // We'll show toasts through a separate mechanism
      }
    );

    // Listen to all notifications to catch new ones
    const notificationUnsubscribe = subscribeToNewNotifications();

    return () => {
      unsubscribe();
      if (notificationUnsubscribe) notificationUnsubscribe();
    };
  }, [user, subscribeToNewNotifications]);

  const showToast = (notification) => {
    const toast = {
      id: notification.id,
      title: getNotificationTitle(notification),
      message: getNotificationMessage(notification),
      targetRoute: notification.targetRoute,
      timestamp: Date.now()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(toast.id);
    }, 5000);
  };

  const getNotificationTitle = (notification) => {
    switch (notification.type) {
      case 'new_message':
        return `${notification.fromUserName}`;
      case 'course_broadcast':
        return `📢 ${notification.courseName}`;
      case 'course_message':
        return `💬 ${notification.courseName}`;
      case 'course_direct':
        return `✉️ ${notification.fromUserName}`;
      case 'trip_broadcast':
        return `📢 ${notification.tripName}`;
      case 'trip_message':
        return `💬 ${notification.tripName}`;
      case 'trip_direct':
        return `✉️ ${notification.fromUserName}`;
      case 'buddy_request':
        return `👋 Buddy Request`;
      default:
        return 'New Notification';
    }
  };

  const getNotificationMessage = (notification) => {
    if (notification.messagePreview) {
      return notification.messagePreview;
    }

    switch (notification.type) {
      case 'buddy_request':
        return `${notification.fromUserName} wants to be buddies`;
      default:
        return 'You have a new notification';
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleToastClick = (toast) => {
    if (toast.targetRoute) {
      navigate(toast.targetRoute);
    }
    removeToast(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast"
          onClick={() => handleToastClick(toast)}
        >
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
