// ChatPreview.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export const ChatPreview = ({ chat, isSelected, onClick }) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch participant details
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const participantIds = chat.activeParticipants?.filter(id => id !== user.uid) || [];

        const participantPromises = participantIds.map(async (userId) => {
          const [userDoc, profileDoc] = await Promise.all([
            getDoc(doc(db, 'users', userId)),
            getDoc(doc(db, 'profiles', userId))
          ]);
          if (userDoc.exists()) {
            return {
              id: userId,
              ...userDoc.data(),
              ...profileDoc.data()
            };
          }
          return null;
        });

        const participantData = (await Promise.all(participantPromises))
          .filter(Boolean);
        setParticipants(participantData);
      } catch (err) {
        console.error('Error fetching participants:', err);
        setError('Failed to load participants');
      }
    };

    if (chat && user) {
      fetchParticipants();
    }
  }, [chat, user]);

  // Listen for last message
  useEffect(() => {
    if (!chat?.id) return;

    const q = query(
      collection(db, `messages/${chat.id}/content`),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const message = snapshot.docs[0].data();
        setLastMessage(message);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching last message:', err);
      setError('Failed to load message');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chat?.id]);

  const getChatName = () => {
    if (chat.type === 'direct') {
      return participants[0]?.displayName || participants[0]?.name || 'Unknown User';
    }
    return participants.map(p => p.displayName || p.name).join(', ');
  };

  const getLastMessagePreview = () => {
    if (!lastMessage) return 'No messages yet';
    if (lastMessage.senderId === user.uid) return `You: ${lastMessage.text}`;
    
    const sender = participants.find(p => p.id === lastMessage.senderId);
    return `${sender?.displayName || 'Unknown'}: ${lastMessage.text}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * oneDay) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 hover:bg-gray-100 cursor-pointer transition-colors ${
        isSelected ? 'bg-gray-100' : ''
      }`}
    >
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-medium truncate flex-1">
              {getChatName()}
            </h3>
            {lastMessage?.timestamp && (
              <span className="text-xs text-gray-500 ml-2">
                {formatTimestamp(lastMessage.timestamp)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">
            {loading ? 'Loading...' : getLastMessagePreview()}
          </p>
        </>
      )}
    </div>
  );
};