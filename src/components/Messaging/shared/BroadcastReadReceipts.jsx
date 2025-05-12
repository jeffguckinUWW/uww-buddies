// BroadcastReadReceipts.jsx
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useMessages } from '../../../context/MessageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';

const BroadcastReadReceipts = ({ message, isInstructor, isSmallScreen = false }) => {
  const { user } = useAuth();
  const { markAsRead } = useMessages();
  const [retryCount, setRetryCount] = useState(0);

  // Always define the useEffect hook, but make its logic conditional
  useEffect(() => {
    if (!message || !user || !message.type?.includes('broadcast')) {
      return;
    }

    // Skip if already read
    if (message.readBy?.includes(user.uid)) {
      return;
    }

    // Add a small delay before marking as read to avoid permission errors
    // This helps when the component loads before permissions are fully established
    const timeoutId = setTimeout(() => {
      markAsRead(message.id, user.uid, true)
        .then(() => {
          // Successfully marked as read
        })
        .catch(err => {
          console.error('Error marking message as read:', err);
          
          // If we still have retries left, increment retry count which will trigger a retry
          if (retryCount < 3) {
            setRetryCount(prevCount => prevCount + 1);
          }
        });
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [message, user, markAsRead, retryCount]);

  // Exit early if not a broadcast message
  if (!message.type?.includes('broadcast')) return null;

  // Calculate read count more reliably
  const getReadCount = () => {
    if (!message.readStatus) return 0;
    return Object.values(message.readStatus).filter(statusObj => statusObj.read).length;
  };

  const readCount = getReadCount();
  const totalRecipients = message.totalRecipients || 0;
  const readStatus = message.readStatus || {};

  // If not instructor, just show basic count
  if (!isInstructor) {
    return (
      <span className="text-xs text-gray-500">
        {readCount}/{totalRecipients} read
      </span>
    );
  }

  // For instructors, show detailed modal
  const readUsers = Object.entries(readStatus)
  .filter(([_, statusObj]) => statusObj.read)
  .sort((a, b) => {
    // Properly handle Firestore timestamps
    const getTime = (timestamp) => {
      if (!timestamp) return 0;
      // Check if it's a Firestore Timestamp (has toDate method)
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().getTime();
      }
      // Already a Date object
      if (timestamp instanceof Date) {
        return timestamp.getTime();
      }
      // Try to parse it as a string timestamp
      try {
        return new Date(timestamp).getTime();
      } catch (e) {
        console.warn('Invalid timestamp format:', timestamp);
        return 0;
      }
    };

    const timeA = getTime(a[1]?.readAt);
    const timeB = getTime(b[1]?.readAt);
    return timeB - timeA; // Most recent first
  });

  const unreadUsers = Object.entries(readStatus)
    .filter(([_, statusObj]) => !statusObj.read);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={`flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 ${
          isSmallScreen ? 'p-2 touch-target' : ''
        } no-tap-highlight`}>
          <Users size={isSmallScreen ? 16 : 14} />
          {readCount}/{totalRecipients} read
        </button>
      </DialogTrigger>
      <DialogContent className={`${isSmallScreen ? 'w-[95%]' : 'max-w-md'}`}>
        <DialogHeader>
          <DialogTitle className="text-lg">Read Receipts</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto smooth-scroll p-1">
          {/* Read Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-600 mb-2 px-2">
              Read ({readUsers.length})
            </h3>
            <div className="space-y-2">
              {readUsers.map(([userId, statusObj]) => (
                <div key={userId} className={`flex justify-between items-center text-sm px-2 py-2 ${
                  isSmallScreen ? 'hover:bg-gray-50 rounded' : ''
                }`}>
                  <span className="font-medium">{readStatus[userId]?.name || 'Unknown User'}</span>
                  <span className="text-xs text-gray-500">
                  {statusObj.readAt ? format(
  statusObj.readAt.toDate ? statusObj.readAt.toDate() : 
  (statusObj.readAt instanceof Date ? statusObj.readAt : new Date(statusObj.readAt)), 
  'MMM d, h:mm a'
) : 'Time unknown'}
                  </span>
                </div>
              ))}
              {readUsers.length === 0 && (
                <div className="text-sm text-gray-500 px-2 py-2">No one has read this message yet</div>
              )}
            </div>
          </div>

          {/* Unread Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2 px-2">
              Not Yet Read ({unreadUsers.length})
            </h3>
            <div className="space-y-2">
              {unreadUsers.map(([userId]) => (
                <div key={userId} className={`text-sm text-gray-500 px-2 py-2 ${
                  isSmallScreen ? 'hover:bg-gray-50 rounded' : ''
                }`}>
                  {readStatus[userId]?.name || 'Unknown User'}
                </div>
              ))}
              {unreadUsers.length === 0 && (
                <div className="text-sm text-gray-500 px-2 py-2">Everyone has read this message</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastReadReceipts;