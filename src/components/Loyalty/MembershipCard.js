import React, { useState } from 'react';
import { Barcode } from 'lucide-react';
import { Card } from '../../components/ui/card';

const MembershipCard = ({ 
  tier,
  memberName,
  memberId,
  joinDate 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getCardImage = (tier) => {
    const imageMap = {
      'OCEANIC_SILVER': '/images/badges/OSM.png',
      'MARINER_GOLD': '/images/badges/MGM.png',
      'NAUTILUS_PLATINUM': '/images/badges/NPM.png',
      'TRIDENT_ELITE': '/images/badges/TEM.png',
      'LIFETIME_ELITE': '/images/badges/TEL.png'
    };
    return imageMap[tier] || imageMap.OCEANIC_SILVER;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-md mx-auto perspective-1000">
      <Card 
        onClick={() => setIsFlipped(!isFlipped)}
        className={`relative w-full transition-transform duration-700 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front of card */}
        <div className="w-full backface-hidden">
          <img 
            src={getCardImage(tier)} 
            alt={`${tier} Membership Card`}
            className="w-full h-auto rounded-lg"
          />
        </div>

        {/* Back of card */}
        <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">{memberName}</h3>
              <p className="text-sm opacity-80">Member since: {formatDate(joinDate)}</p>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm opacity-80">
                <p>Member ID:</p>
                <p className="font-mono">{memberId}</p>
              </div>
              
              <div className="h-16 border-2 border-white/20 rounded flex items-center justify-center">
                <Barcode className="w-full h-12" />
              </div>
              
              <p className="text-xs text-center opacity-60">
                Tap card to flip
              </p>
            </div>
          </div>
        </Card>
      </Card>
    </div>
  );
};

export default MembershipCard;