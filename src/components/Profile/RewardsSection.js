import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Award, X, Maximize2 } from 'lucide-react';
import MembershipCard from '../Loyalty/MembershipCard';
import LoyaltyModal from '../Loyalty/LoyaltyModal';

// Redesigned RewardsSection for horizontal layout
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
  const formatMemberId = (id) => {
    if (!id) return 'MEMBER-ID';
    
    // Return the full ID without truncating
    return id.toUpperCase();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Award className="h-5 w-5 text-blue-600 mr-2" />
        DiveRewards
      </h2>
      
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Points Summary */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700">Your Points</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <span className="text-gray-500 text-sm">Available</span>
                <p className="font-semibold text-gray-900 text-xl">
                  {loyaltyData.redeemablePoints.toLocaleString()}
                  <span className="text-sm text-gray-500 ml-1">pts</span>
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <span className="text-gray-500 text-sm">Lifetime</span>
                <p className="font-semibold text-gray-900 text-xl">
                  {loyaltyData.lifetimePoints.toLocaleString()}
                  <span className="text-sm text-gray-500 ml-1">pts</span>
                </p>
              </div>
            </div>
            
            {/* Transaction History Toggle */}
            {loyaltyData.transactions?.length > 0 && (
              <div>
                <button
                  onClick={() => setIsTransactionsExpanded(!isTransactionsExpanded)}
                  className="flex items-center justify-between w-full p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-medium text-gray-700">Transaction History</span>
                  {isTransactionsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {isTransactionsExpanded && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {loyaltyData.transactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-2 text-sm border-b last:border-b-0">
                        <div>
                          <p className="text-gray-900">
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
              className="w-full flex items-center justify-between p-2 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <span>Program Details</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Center & Right - Membership Card */}
          <div className="md:col-span-2">
            <div className="flex flex-col h-full">
              {/* Card preview */}
              <div className="flex-1 relative">
                <div 
                  onClick={() => setShowFullCard(true)}
                  className="rounded-xl overflow-hidden cursor-pointer relative hover:shadow-lg transition-shadow w-full"
                >
                  {/* Card with proper formatting and display - direct without any background container */}
                  <MembershipCard 
                    tier={loyaltyData.currentTier?.tier}
                    memberName={profile.name}
                    memberId={formatMemberId(userId)}
                    joinDate={loyaltyData.joinDate}
                    certificationLevel={profile.certificationLevel}
                    redeemablePoints={loyaltyData.redeemablePoints}
                  />
                  
                  {/* Subtle "enlarge" indicator */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-20 hover:bg-opacity-50 p-1 rounded-full transition-all">
                    <Maximize2 className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Info for staff */}
              {isStaffCard(profile.certificationLevel) && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-md text-sm text-blue-700 mt-3">
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
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* Full card display with properly formatted member ID and points data */}
            <div className="transform hover:scale-[1.02] transition-transform">
              <MembershipCard 
                tier={loyaltyData.currentTier?.tier}
                memberName={profile.name}
                memberId={formatMemberId(userId)}
                joinDate={loyaltyData.joinDate}
                certificationLevel={profile.certificationLevel}
                redeemablePoints={loyaltyData.redeemablePoints}
              />
            </div>
            
            <p className="text-center text-white text-sm mt-4">
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