import React, { useState } from 'react';
import { Shield, Award, Calendar, UserSquare2 } from 'lucide-react';

const MembershipCard = ({ tier, memberName, memberId, joinDate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    if (isExpanded) {
      setIsFlipped(!isFlipped);
    } else {
      setIsExpanded(true);
    }
  };

  const cardColors = {
    OCEANIC_SILVER: 'from-gray-100 to-gray-300',
    MARINER_GOLD: 'from-amber-100 to-amber-300',
    NAUTILUS_PLATINUM: 'from-slate-300 to-slate-500',
    TRIDENT_ELITE: 'from-indigo-300 to-indigo-500',
    LIFETIME_ELITE: 'from-purple-300 to-purple-500'
  };

  const textColors = {
    OCEANIC_SILVER: 'text-gray-800',
    MARINER_GOLD: 'text-amber-900',
    NAUTILUS_PLATINUM: 'text-white',
    TRIDENT_ELITE: 'text-white',
    LIFETIME_ELITE: 'text-white'
  };

  const borderColors = {
    OCEANIC_SILVER: 'border-gray-200',
    MARINER_GOLD: 'border-amber-200',
    NAUTILUS_PLATINUM: 'border-slate-400',
    TRIDENT_ELITE: 'border-indigo-400',
    LIFETIME_ELITE: 'border-purple-400'
  };

  return (
    <div 
      className={`
        relative transition-all duration-300 ease-in-out
        ${isExpanded ? 'h-80' : 'h-48'}
      `}
    >
      <div 
        onClick={handleClick}
        className={`
          cursor-pointer absolute inset-0
          [perspective:1000px] transform-gpu
          transition-transform duration-300 ease-in-out
          ${isExpanded ? 'scale-105' : ''}
        `}
      >
        <div
          className={`
            relative w-full h-full
            transition-transform duration-500 ease-in-out
            transform-gpu preserve-3d
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
        >
          {/* Front of card */}
          <div
            className={`
              absolute inset-0 backface-hidden
              rounded-xl bg-gradient-to-br ${cardColors[tier]} 
              border-2 ${borderColors[tier]} shadow-lg p-4
              flex flex-col justify-between
            `}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span className={`font-semibold ${textColors[tier]}`}>
                    {tier?.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${textColors[tier]}`}>Membership Card</p>
              </div>
              <Award className={`w-8 h-8 ${textColors[tier]}`} />
            </div>
            
            <div className={textColors[tier]}>
              <p className="font-bold text-lg">{memberName}</p>
              <p className="text-sm opacity-75">Member #{memberId}</p>
            </div>
          </div>

          {/* Back of card */}
          <div
            className={`
              absolute inset-0 backface-hidden rotate-y-180
              rounded-xl bg-gradient-to-br ${cardColors[tier]} 
              border-2 ${borderColors[tier]} shadow-lg p-4
              flex flex-col justify-between
            `}
          >
            <div className={`space-y-4 ${textColors[tier]}`}>
              <h3 className="font-semibold">Membership Details</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <UserSquare2 className="w-4 h-4" />
                  <div>
                    <p className="text-sm opacity-75">Member ID</p>
                    <p className="font-medium">{memberId}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <p className="text-sm opacity-75">Member Since</p>
                    <p className="font-medium">{new Date(joinDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <div>
                    <p className="text-sm opacity-75">Current Tier</p>
                    <p className="font-medium">
                      {tier?.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className={`text-xs ${textColors[tier]} opacity-75 text-center mt-2`}>
              Click card to flip
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;