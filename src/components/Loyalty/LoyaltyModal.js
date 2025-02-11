import React from 'react';
import { X } from 'lucide-react';

const LoyaltyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-2xl font-bold text-gray-900">DiveRewards Program</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Program Overview */}
          <div>
            <p className="text-gray-700">
              Welcome to our exclusive diving community rewards program. Getting started is simple – 
              download our app and complete your profile to begin earning points on every purchase.
            </p>
          </div>

          {/* Membership Tiers */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Membership Tiers & Benefits</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Oceanic Silver (0 - 9,999 points)</h4>
                <p className="text-gray-600">Base earning rate (1.0x multiplier)</p>
              </div>
              <div>
                <h4 className="font-medium">Mariner Gold (10,000 - 19,999 points)</h4>
                <p className="text-gray-600">Enhanced earning rate (1.2x multiplier)</p>
              </div>
              <div>
                <h4 className="font-medium">Nautilus Platinum (20,000 - 49,999 points)</h4>
                <p className="text-gray-600">Premium earning rate (1.5x multiplier)</p>
              </div>
              <div>
                <h4 className="font-medium">Trident Elite (50,000 - 99,999 points)</h4>
                <p className="text-gray-600">Elite earning rate (2.0x multiplier)</p>
              </div>
              <div>
                <h4 className="font-medium">Lifetime Elite (100,000+ points)</h4>
                <p className="text-gray-600">Elite earning rate (2.0x multiplier)</p>
                <p className="text-gray-600">Points never expire</p>
              </div>
            </div>
          </div>

          {/* Earning Points */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Earning Points</h3>
            <div className="space-y-2">
              <p className="text-gray-700">Earn points on every purchase:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Equipment: 5 points per $1</li>
                <li>Service: 10 points per $1</li>
                <li>Courses: 10 points per $1</li>
                <li>Trips: 1 point per $1</li>
                <li>Rentals: 5 points per $1</li>
              </ul>
              <p className="text-gray-700 mt-2">Points Value: 100 points = $1 in rewards</p>
            </div>
          </div>

          {/* Points Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Points Categories</h3>
            <div className="space-y-2">
              <p className="text-gray-700">Your points accumulate in two categories:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Lifetime Points: Your total earned points that determine your tier status</li>
                <li>Redeemable Points: Available points for purchases</li>
              </ul>
            </div>
          </div>

          {/* Annual Requirements */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Annual Requirements</h3>
            <p className="text-gray-700">
              To maintain your tier status and points balance, earn 10% of your minimum tier level annually. 
              If not met, both redeemable and lifetime points will be reduced by 10%. Lifetime Elite members 
              are exempt from this requirement.
            </p>
          </div>

          {/* How to Earn Points */}
          <div>
            <h3 className="text-lg font-semibold mb-3">How to Earn Points</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>In-Store: Present your digital membership card for scanning at checkout</li>
              <li>Online: Include your member number (found in the app) in the order notes</li>
            </ul>
            <p className="text-gray-700 mt-2">
              Your points balance and transaction history are always available in the app. 
              Returns will be adjusted from your points balance accordingly.
            </p>
          </div>

          {/* How to Redeem Points */}
          <div>
            <h3 className="text-lg font-semibold mb-3">How to Redeem Points</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Convert your points into digital gift cards through the app</li>
              <li>Gift cards can be used both in-store and online</li>
              <li>No expiration date on issued gift cards</li>
              <li>Processing time approximately 24 hours</li>
              <li>Request gift cards directly through the app</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyModal;