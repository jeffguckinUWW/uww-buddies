import React, { useState, useEffect, useMemo } from 'react';
import { Shield } from 'lucide-react';
import Barcode from 'react-barcode';

const MembershipCard = ({ 
  tier, 
  memberName, 
  memberId, 
  joinDate,
  certificationLevel,
  redeemablePoints,
  loyaltyCode // Add this prop to explicitly receive loyalty code
}) => {
  const [showBack, setShowBack] = useState(false);
  const [cardImage, setCardImage] = useState(null);
  const [displayTier, setDisplayTier] = useState(tier);

  // Define paths to card images - memoized to avoid dependency issues
  const tierCardImages = useMemo(() => ({
    OCEANIC_SILVER: '/images/Loyalty/OSM.png',
    MARINER_GOLD: '/images/Loyalty/MGM.png',
    NAUTILUS_PLATINUM: '/images/Loyalty/NPM.png',
    TRIDENT_ELITE: '/images/Loyalty/TEM.png',
    LIFETIME_ELITE: '/images/Loyalty/TEL.png'
  }), []);

  const specialCardImages = useMemo(() => ({
    INSTRUCTOR: '/images/Loyalty/INST.png',
    DIVEMASTER: '/images/Loyalty/DM.png'
  }), []);

  // Determine which card to display based on certification level
  useEffect(() => {
    // Check if user is an instructor or divemaster
    const isInstructor = certificationLevel === "Instructor" || certificationLevel === "Assistant Instructor";
    const isDivemaster = certificationLevel === "Divemaster";
    
    // Set the appropriate display tier and card image
    if (isInstructor) {
      setDisplayTier('INSTRUCTOR');
      setCardImage(specialCardImages.INSTRUCTOR);
    } else if (isDivemaster) {
      setDisplayTier('DIVEMASTER');
      setCardImage(specialCardImages.DIVEMASTER);
    } else {
      // Default to tier-based card
      setDisplayTier(tier);
      setCardImage(tierCardImages[tier]);
    }
  }, [tier, certificationLevel, tierCardImages, specialCardImages]);

  const handleClick = () => {
    setShowBack(!showBack);
  };

  // Format points display
  const formattedPoints = typeof redeemablePoints === 'number' 
    ? `${redeemablePoints.toLocaleString()} pts` 
    : 'Check your account';

  // Determine the barcode value - prioritize loyaltyCode if available
  const barcodeValue = loyaltyCode || memberId || 'MEMBER-ID';

  // Simplified card with direct front/back toggle
  return (
    <div 
      className="relative w-full cursor-pointer rounded-xl shadow-md overflow-hidden"
      style={{ aspectRatio: '1.6/1' }}
      onClick={handleClick}
    >
      {/* Front of card - only visible when showBack is false */}
      {!showBack && (
        <div className="w-full h-full">
          {cardImage ? (
            <img 
              src={cardImage} 
              alt={`${getTierName(displayTier)} Membership Card`}
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full bg-blue-600 flex items-center justify-center">
              <p className="text-white text-xl">Membership Card</p>
            </div>
          )}
        </div>
      )}
      
      {/* Back of card - only visible when showBack is true */}
      {showBack && (
        <div className="w-full h-full bg-white border border-gray-200 p-4 overflow-y-auto">
          <div className="flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-semibold text-gray-800">Underwater World</h3>
              <div className="w-8 h-8 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            {/* Member information */}
            <div className="py-2 space-y-2 flex-grow">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-gray-800">{memberName || 'Member'}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500">Member Since</p>
                <p className="font-medium text-gray-800">
                  {joinDate?.seconds 
                    ? new Date(joinDate.seconds * 1000).toLocaleDateString() 
                    : joinDate instanceof Date
                      ? joinDate.toLocaleDateString()
                      : 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500">Redeemable Rewards Points</p>
                <p className="font-medium text-gray-800">{formattedPoints}</p>
              </div>
            </div>
            
            {/* Scannable Barcode - using react-barcode */}
            <div className="mt-1 pt-2 border-t">
              <div className="flex flex-col items-center">
              <Barcode
  value={barcodeValue}
  format="CODE39" // Try CODE39 which is often better for hardware scanners
  width={2.5}     // Increase width of bars (was 1.5)
  height={70}     // Increase height (was 40)
  displayValue={true}
  textMargin={8}  // Increase text margin (was 2)
  fontSize={14}   // Larger text (was 12)
  margin={10}     // Add more margin around the barcode (was 0)
/>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 text-center mt-2">
              Click card to flip
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get tier name for display
const getTierName = (tierKey) => {
  if (tierKey === 'INSTRUCTOR') return 'Instructor';
  if (tierKey === 'DIVEMASTER') return 'Divemaster';
  
  // Format regular tier names
  return tierKey?.split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default MembershipCard;