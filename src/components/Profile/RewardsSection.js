import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import MembershipCard from '../Loyalty/MembershipCard';
import LoyaltyModal from '../Loyalty/LoyaltyModal';

const RewardsSection = ({ loyaltyData, profile, userId }) => {
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);

  return (
    <div className="mt-6 border-t pt-4">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Membership & Rewards</h3>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Available Points</p>
            <p className="text-base font-semibold text-gray-900">
              {loyaltyData.redeemablePoints.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Lifetime</p>
            <p className="text-base font-semibold text-gray-900">
              {loyaltyData.lifetimePoints.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Membership Card */}
      <MembershipCard 
        tier={loyaltyData.currentTier?.tier}
        memberName={profile.name}
        memberId={userId?.slice(-6)}
        joinDate={loyaltyData.joinDate}
      />

      {/* Learn More Button */}
      <button 
  onClick={() => {
    console.log('Learn More clicked');
    console.log('Current modal state:', isLoyaltyModalOpen);
    setIsLoyaltyModalOpen(true);
    console.log('New modal state:', true);
  }}
  className="w-full mt-4 py-3 flex justify-between items-center border-t border-gray-200 hover:bg-gray-50 transition-colors"
>
        <span className="text-gray-700">Learn More About DiveRewards</span>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </button>

      {/* Transaction History Section */}
      {loyaltyData.transactions?.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsTransactionsExpanded(!isTransactionsExpanded)}
            className="flex items-center justify-between w-full p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span className="font-medium">Transaction History</span>
            {isTransactionsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isTransactionsExpanded && (
            <div className="mt-2 space-y-2">
              {loyaltyData.transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-2 text-sm border-b last:border-b-0">
                  <div>
                    <p className="text-gray-900">
                      {transaction.type === 'earn' ? 'Points Earned' : 'Points Redeemed'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date?.seconds * 1000).toLocaleDateString()}
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

      {/* Loyalty Modal */}
      <LoyaltyModal 
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
      />
    </div>
  );
};

export default RewardsSection;