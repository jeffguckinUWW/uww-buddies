// ThreadView.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import MessageList from './MessageList';
import { useMessages } from '../../../context/MessageContext'  // Adjust the path based on your actual file structure
import { Textarea } from '../../../components/ui/textarea'
import { Button } from '../../../components/ui/button'

const ThreadView = ({
  parentMessage,
  currentUserId,
  onClose,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messageEndRef = useRef(null);
  
  const {
    threadMessages,
    threadLoading,
    threadError,
    threadHasMore,
    loadMoreThreadMessages,
    sendReply,
    deleteMessage,
    editMessage,
    clearActiveThread,
    addReaction
  } = useMessages();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      clearActiveThread();
    };
  }, [clearActiveThread]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleScroll = (e) => {
    const element = e.target;
    if (element.scrollTop === 0 && threadHasMore && !threadLoading) {
      loadMoreThreadMessages(parentMessage.id);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await sendReply({
        text: replyText.trim(),
        senderId: currentUserId,
        courseId: parentMessage.courseId,
        tripId: parentMessage.tripId,
        chatId: parentMessage.chatId,
        type: parentMessage.type
      }, parentMessage.id);
      
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId, currentUserId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    try {
      await editMessage(messageId, newText, currentUserId);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="font-medium">Thread</h3>
          <p className="text-sm text-gray-500">
            {threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}
          </p>
        </div>
      </div>

      {/* Thread Messages */}
      <div 
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Parent Message */}
        {parentMessage && (
          <div className="p-4 border-b">
            <div className="text-sm text-gray-500 mb-2">Original Message</div>
            <MessageList
              messages={[parentMessage]}
              currentUserId={currentUserId}
              onDeleteMessage={handleDeleteMessage}
              onEditMessage={handleEditMessage}
              onReactionSelect={handleReaction}
              loading={threadLoading}
              error={threadError}
              threadView={true}
            />
          </div>
        )}

        {/* Reply Messages */}
        <MessageList
          messages={threadMessages}
          currentUserId={currentUserId}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onReactionSelect={handleReaction}
          loading={threadLoading}
          error={threadError}
          threadView={true}
        />
        <div ref={messageEndRef} />
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Write a reply..."
            className="flex-1"
            rows={1}
          />
          <Button
            onClick={handleSendReply}
            disabled={!replyText.trim() || isSubmitting}
            size="icon"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThreadView;