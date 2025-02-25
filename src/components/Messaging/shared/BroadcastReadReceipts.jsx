// BroadcastReadReceipts.jsx
import React from 'react';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';

const BroadcastReadReceipts = ({ message, isInstructor }) => {
  if (!message.type?.includes('broadcast')) return null;

  const readCount = message.readCount || 0;
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
    .filter(([_, status]) => status.read)
    .sort((a, b) => new Date(b[1].readAt) - new Date(a[1].readAt));

  const unreadUsers = Object.entries(readStatus)
    .filter(([_, status]) => !status.read);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <Users size={14} />
          {readCount}/{totalRecipients} read
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Read Receipts</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Read Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-green-600 mb-2">
              Read ({readUsers.length})
            </h3>
            <div className="space-y-2">
              {readUsers.map(([userId, status]) => (
                <div key={userId} className="flex justify-between items-center text-sm">
                  <span>{message.readStatus[userId].name || 'Unknown User'}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(status.readAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Unread Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Not Yet Read ({unreadUsers.length})
            </h3>
            <div className="space-y-2">
              {unreadUsers.map(([userId]) => (
                <div key={userId} className="text-sm text-gray-500">
                  {message.readStatus[userId].name || 'Unknown User'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastReadReceipts;