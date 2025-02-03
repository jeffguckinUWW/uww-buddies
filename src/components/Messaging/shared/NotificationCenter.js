import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { Bell, X, MessageCircle, Users, BookOpen, Megaphone } from 'lucide-react';

const NotificationCenter = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('toUser', '==', user.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setNotifications(notificationList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now - timestamp;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'buddy_request':
        return <Users className="w-5 h-5 text-green-500" />;
      case 'course_response':
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'course_announcement':
        return <Megaphone className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Detailed debug logging
      console.log('Clicking notification:', {
        fullNotification: notification,
        type: notification.type,
        courseId: notification.courseId,
        messageId: notification.messageId,
        chatId: notification.chatId
      });
      
      await markAsRead(notification.id);
      
      switch (notification.type) {
        case 'course_message':
          navigate(`/training`, {
            state: { 
              selectedCourseId: notification.courseId,
              messageId: notification.messageId,
              scrollToMessage: true,
              highlightMessage: true,
              openDiscussion: true // Flag to open the discussion tab
            }
          });
          break;
          
        case 'new_message':
          navigate(`/messages/${notification.chatId}`, { 
            state: { 
              messageId: notification.messageId,
              scrollToMessage: true,
              highlightMessage: true
            } 
          });
          break;

        case 'course_response':
          navigate(`/training/${notification.courseId}/announcements`, {
            state: { 
              messageId: notification.messageId,
              scrollToMessage: true,
              highlightMessage: true
            }
          });
          break;

        case 'buddy_request':
          navigate('/buddies/requests', {
            state: { 
              requestId: notification.requestId,
              fromUser: notification.fromUser,
              highlightRequest: true
            }
          });
          break;

        default:
          if (notification.targetRoute) {
            navigate(notification.targetRoute);
          }
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const NotificationContent = ({ notification }) => {
    const { type, fromUserName, messagePreview, courseName, timestamp } = notification;
    
    const getContent = () => {
      const base = {
        icon: getNotificationIcon(type),
        time: formatTimestamp(timestamp)
      };

      switch (type) {
        case 'course_message':
          return {
            ...base,
            title: `Course Message from ${fromUserName}`,
            preview: messagePreview || 'New message in course',
            badge: 'Course Message',
            badgeColor: 'bg-purple-100 text-purple-800'
          };
        
        case 'new_message':
          return {
            ...base,
            title: `Message from ${fromUserName}`,
            preview: messagePreview || 'New direct message received',
            badge: 'Direct Message',
            badgeColor: 'bg-blue-100 text-blue-800'
          };

        case 'course_response':
          return {
            ...base,
            title: `Course Announcement Response`,
            preview: `${fromUserName} replied in ${courseName || 'Unknown course'}: ${messagePreview || ''}`,
            badge: 'Course Response',
            badgeColor: 'bg-orange-100 text-orange-800'
          };

        case 'buddy_request':
          return {
            ...base,
            title: 'New Buddy Request',
            preview: `${fromUserName} would like to connect with you`,
            badge: 'Buddy Request',
            badgeColor: 'bg-green-100 text-green-800'
          };

        default:
          return {
            ...base,
            title: fromUserName ? `New notification from ${fromUserName}` : 'New notification',
            preview: messagePreview || 'Click to view details',
            badge: 'Notification',
            badgeColor: 'bg-gray-100 text-gray-800'
          };
      }
    };

    const content = getContent();

    return (
      <button
        onClick={() => handleNotificationClick(notification)}
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0 mt-1">{content.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-900 line-clamp-1">{content.title}</p>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${content.badgeColor}`}>
                {content.badge}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{content.preview}</p>
            <p className="text-xs text-gray-500 mt-2">{content.time}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="relative">
      <div 
        className="fixed inset-0 bg-black/40 z-[100]"
        onClick={onClose}
      />
      
      <div className="fixed right-4 top-[4.5rem] w-96 max-h-[80vh] bg-white shadow-lg rounded-lg z-[110] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            <h2 className="font-medium">Notifications</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 max-h-[calc(80vh-4rem)]">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No new notifications
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <NotificationContent 
                  key={notification.id} 
                  notification={notification} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;