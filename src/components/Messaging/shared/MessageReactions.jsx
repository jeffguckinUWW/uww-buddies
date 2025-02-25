import React, { useState } from 'react';
import { useMessages } from '../../../context/MessageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';

const MessageReactions = ({ message, currentUserId }) => {
  const { getSortedReactions } = useMessages();
  
  if (!message.reactions) return null;
  
  const sortedReactions = getSortedReactions(message.reactions);
  if (sortedReactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {sortedReactions.map(({ emoji, count, users }) => {
        const hasUserReacted = users.some(user => user.id === currentUserId);
        
        return (
          <TooltipProvider key={emoji}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full 
                    ${hasUserReacted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} 
                    hover:bg-gray-200 transition-colors`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs">{count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs max-w-xs">
                  <p className="font-medium mb-1">Reactions:</p>
                  <ul>
                    {users.map((user, index) => (
                      <li key={user.id} className={user.id === currentUserId ? 'font-medium' : ''}>
                        {user.name} {user.id === currentUserId && '(You)'}
                      </li>
                    )).slice(0, 5)}
                    {users.length > 5 && <li>+{users.length - 5} more</li>}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

export default MessageReactions;