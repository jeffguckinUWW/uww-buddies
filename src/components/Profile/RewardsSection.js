import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Award, X, Maximize2 } from 'lucide-react';
import MembershipCard from '../Loyalty/MembershipCard';
import LoyaltyModal from '../Loyalty/LoyaltyModal';

// Redesigned RewardsSection with improved styling and mobile responsiveness
const RewardsSection = ({ loyaltyData, profile, userId }) => {
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [showFullCard, setShowFullCard] = useState(false);

  // Helper function to check if the user has a staff card
  const isStaffCard = (certificationLevel) => {
    return certificationLevel === 'Instructor' || 
          certificationLevel === 'Assistant Instructor' || 
          certificationLevel === 'Divemaster';
  };
  
  // Format member ID properly - now using the full ID
  const formatMemberId = (id, profile) => {
    // Use loyalty code if available
    if (profile.loyaltyCode) {
      return profile.loyaltyCode;
    }
    
    // Fallback to user ID if no loyalty code
    if (!id) return 'MEMBER-ID';
    return id.toUpperCase();
  };

  return (
    <div>
      <h2 className="text-sm uppercase font-semibold text-gray-700 mb-3 flex items-center tracking-wide">
        <Award className="h-4 w-4 text-blue-600 mr-2" />
        DiveRewards
      </h2>
      
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100 shadow-sm p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column - Points Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Your Points</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
                <span className="text-gray-500 text-xs">Available</span>
                <p className="font-semibold text-gray-900 text-lg">
                  {loyaltyData.redeemablePoints.toLocaleString()}
                  <span className="text-xs text-gray-500 ml-1">pts</span>
                </p>
              </div>
              <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
                <span className="text-gray-500 text-xs">Lifetime</span>
                <p className="font-semibold text-gray-900 text-lg">
                  {loyaltyData.lifetimePoints.toLocaleString()}
                  <span className="text-xs text-gray-500 ml-1">pts</span>
                </p>
              </div>
            </div>
            
            {/* Transaction History Toggle */}
            {loyaltyData.transactions?.length > 0 && (
              <div>
                <button
                  onClick={() => setIsTransactionsExpanded(!isTransactionsExpanded)}
                  className="flex items-center justify-between w-full p-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                >
                  <span className="font-medium text-gray-700">Transaction History</span>
                  {isTransactionsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {isTransactionsExpanded && (
                  <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                    {loyaltyData.transactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-2 text-xs border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-gray-800 font-medium">
                            {transaction.type === 'earn' ? 'Points Earned' : 'Points Redeemed'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.date?.seconds ? 
                              new Date(transaction.date.seconds * 1000).toLocaleDateString() : 
                              new Date().toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`font-medium ${
                          transaction.type === 'earn' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'earn' ? '+' : '-'}{transaction.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Program Details Button */}
            <button 
              onClick={() => setIsLoyaltyModalOpen(true)}
              className="w-full flex items-center justify-between p-2 mt-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-200 text-xs"
            >
              <span>Program Details</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          {/* Center & Right - Membership Card */}
          <div className="md:col-span-2">
            <div className="flex flex-col h-full">
              {/* Card preview */}
              <div className="flex-1 relative">
                <div 
                  onClick={() => setShowFullCard(true)}
                  className="rounded-lg overflow-hidden cursor-pointer relative hover:shadow-md transition-shadow w-full"
                >
                  {/* Card with proper formatting and display */}
                  <MembershipCard 
                    tier={loyaltyData.currentTier?.tier}
                    memberName={profile.name}
                    memberId={formatMemberId(userId, profile)}
                    loyaltyCode={profile.loyaltyCode} // Explicitly pass the loyalty code
                    joinDate={loyaltyData.joinDate}
                    certificationLevel={profile.certificationLevel}
                    redeemablePoints={loyaltyData.redeemablePoints}
                  />
                  
                  {/* Subtle "enlarge" indicator */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-20 hover:bg-opacity-50 p-1 rounded-full transition-all">
                    <Maximize2 className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Info for staff */}
              {isStaffCard(profile.certificationLevel) && (
                <div className="bg-blue-50 border-l-3 border-blue-300 p-2.5 rounded text-xs text-blue-700 mt-3">
                  <p>As a {profile.certificationLevel}, you cannot earn new loyalty points, but you can still redeem any existing points.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Full Screen Card Modal */}
      {showFullCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
          <div className="relative max-w-xl w-full">
            <button
              onClick={() => setShowFullCard(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
            
            {/* Full card display with properly formatted member ID and points data */}
            <div className="transform hover:scale-[1.01] transition-transform">
              <MembershipCard 
                tier={loyaltyData.currentTier?.tier}
                memberName={profile.name}
                memberId={formatMemberId(userId, profile)}
                loyaltyCode={profile.loyaltyCode}
                joinDate={loyaltyData.joinDate}
                certificationLevel={profile.certificationLevel}
                redeemablePoints={loyaltyData.redeemablePoints}
              />
            </div>
            
            <p className="text-center text-white text-xs mt-3">
              Click the card to flip for more details
            </p>
          </div>
        </div>
      )}
      
      {/* Loyalty Program Modal */}
      <LoyaltyModal 
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
      />
    </div>
  );
};

export default RewardsSection;