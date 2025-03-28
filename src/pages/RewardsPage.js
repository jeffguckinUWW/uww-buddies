import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import LoyaltyModal from '../components/Loyalty/LoyaltyModal';
import { Alert, AlertTitle } from '../components/ui/alert';
import MembershipCard from '../components/Loyalty/MembershipCard';

const TIER_LEVELS = {
  OCEANIC_SILVER: { min: 0, max: 9999, multiplier: 1.0, name: 'Oceanic Silver' },
  MARINER_GOLD: { min: 10000, max: 19999, multiplier: 1.2, name: 'Mariner Gold' },
  NAUTILUS_PLATINUM: { min: 20000, max: 49999, multiplier: 1.5, name: 'Nautilus Platinum' },
  TRIDENT_ELITE: { min: 50000, max: 99999, multiplier: 2.0, name: 'Trident Elite' },
  LIFETIME_ELITE: { min: 100000, max: Infinity, multiplier: 2.0, name: 'Lifetime Elite' }
};

const formatMemberId = (id, profile) => {
  // Use loyalty code if available
  if (profile?.loyaltyCode) {
    return profile.loyaltyCode;
  }
  
  // Fallback to user ID if no loyalty code
  if (!id) return 'MEMBER-ID';
  return id.toUpperCase();
};

const calculateTier = (lifetimePoints) => {
  return Object.entries(TIER_LEVELS).reduce((acc, [tier, details]) => {
    if (lifetimePoints >= details.min && lifetimePoints <= details.max) {
      return { tier, ...details };
    }
    return acc;
  }, TIER_LEVELS.OCEANIC_SILVER);
};

const RewardsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [currentTier, setCurrentTier] = useState(null);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [showGiftCardRequest, setShowGiftCardRequest] = useState(false);
  const [giftCardAmount, setGiftCardAmount] = useState('');
  const [requestStatus, setRequestStatus] = useState({ type: '', message: '' });

  const handleGiftCardRequest = async () => {
    if (!user?.uid || !giftCardAmount) return;
    
    try {
      const pointsNeeded = parseFloat(giftCardAmount) * 100; // $1 = 100 points
      
      if (pointsNeeded > profileData.redeemablePoints) {
        setRequestStatus({
          type: 'error',
          message: 'Insufficient points available'
        });
        return;
      }

      const giftCardRequest = {
        userId: user.uid,
        userName: profileData.name,
        amount: parseFloat(giftCardAmount),
        pointsRequested: pointsNeeded,
        status: 'pending',
        requestDate: new Date(),
        userEmail: user.email
      };

      await addDoc(collection(db, 'giftCardRequests'), giftCardRequest);
      
      setRequestStatus({
        type: 'success',
        message: 'Gift card request submitted successfully'
      });
      setShowGiftCardRequest(false);
      setGiftCardAmount('');
      
      // Clear status after 3 seconds
      setTimeout(() => setRequestStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error('Error submitting gift card request:', error);
      setRequestStatus({
        type: 'error',
        message: 'Error submitting request. Please try again.'
      });
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          const profileDoc = await getDoc(profileRef);
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setProfileData(data);
            setCurrentTier(calculateTier(data.lifetimePoints || 0));
          }
        } catch (error) {
          console.error('Error fetching profile data:', error);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold">DiveRewards</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* User Card */}
        <div className="bg-white p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-1">Hello, {profileData?.name?.split(' ')[0]}</h2>
              <p className="text-gray-700 mb-1">{profileData?.certificationLevel}</p>
              <p className="text-sm text-gray-500">
                Member since {new Date(profileData?.joinDate || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className={`px-4 py-1.5 rounded-lg ${
              currentTier?.tier === 'OCEANIC_SILVER' ? 'bg-gray-100 text-gray-800' :
              currentTier?.tier === 'MARINER_GOLD' ? 'bg-yellow-100 text-yellow-800' :
              currentTier?.tier === 'NAUTILUS_PLATINUM' ? 'bg-slate-200 text-slate-800' :
              'bg-blue-100 text-blue-800'  // For TRIDENT_ELITE and LIFETIME_ELITE
            }`}>
              <span className="text-sm font-medium">{currentTier?.name}</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg mb-4">Points</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Lifetime Points</span>
                <span className="text-xl font-bold">{profileData?.lifetimePoints?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Redeemable Points</span>
                <span className="text-xl font-bold">{profileData?.redeemablePoints?.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* Learn More Button */}
            <button 
              onClick={() => setIsLoyaltyModalOpen(true)}
              className="w-full mt-4 py-3 flex justify-between items-center border-t border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700">Learn More</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            {/* Rewards Wallet Section */}
            <div className="w-full py-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-700">Passes and subscriptions</h3>
                <button
                  onClick={() => setShowGiftCardRequest(true)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} className="mr-1" />
                  Request Gift Card
                </button>
              </div>

              {requestStatus.message && (
                <Alert variant={requestStatus.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                  <AlertTitle>{requestStatus.message}</AlertTitle>
                </Alert>
              )}

              {/* Horizontal Scrolling Cards Container */}
              <div className="relative">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                  {/* Membership Card */}
                  <div className="flex-none w-64">
                  <MembershipCard
                      tier={currentTier?.tier}
                      memberName={profileData?.name}
                      memberId={formatMemberId(user?.uid, profileData)}
                      joinDate={profileData?.joinDate || Date.now()}
                      certificationLevel={profileData?.certificationLevel}
                      redeemablePoints={profileData?.redeemablePoints}
                    />
                  </div>

                  {/* Gift Cards */}
                  {profileData?.giftCards?.map((card, index) => (
                    <div 
                      key={index}
                      className="flex-none w-64 h-40 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-4 text-white"
                    >
                      <div className="h-full flex flex-col justify-between">
                        <div>
                          <p className="text-sm opacity-80">Gift Card</p>
                          <p className="text-2xl font-bold">${card.amount}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-80">Card Number</p>
                          <p className="font-mono">{card.number.slice(-4).padStart(16, '*')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gift Card Request Modal */}
            {showGiftCardRequest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Request Gift Card</h3>
                    <button
                      onClick={() => {
                        setShowGiftCardRequest(false);
                        setGiftCardAmount('');
                        setRequestStatus({ type: '', message: '' });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                      <div className="mt-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={giftCardAmount}
                          onChange={(e) => {
                            setGiftCardAmount(e.target.value);
                            const amount = parseFloat(e.target.value);
                            if (!isNaN(amount) && amount > 0) {
                              const points = amount * 100;
                              setRequestStatus({
                                type: 'info',
                                message: `This will require ${points} points`
                              });
                            } else {
                              setRequestStatus({
                                type: 'error',
                                message: 'Please enter a valid amount'
                              });
                            }
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Enter amount"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Available points: {profileData?.redeemablePoints?.toLocaleString() || 0}
                      </p>
                    </div>

                    <button
                      onClick={handleGiftCardRequest}
                      disabled={!giftCardAmount || parseFloat(giftCardAmount) * 100 > (profileData?.redeemablePoints || 0)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tier Progress Section */}
        <div className="bg-white p-6 rounded-lg">
          <h3 className="text-2xl font-bold mb-2">Your Progress</h3>
          <p className="text-sm text-gray-600 mb-6">
            Earned in {new Date().getFullYear()}
          </p>

          <div className="flex justify-around items-center">
            {/* Next Tier Progress Circle */}
            <div className="text-center">
              <div className="relative inline-block w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    transform="rotate(-90 18 18)"
                    fill="none"
                    stroke="#eee"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4263eb"
                    strokeWidth="2"
                    strokeDasharray={`${getProgressPercentage(
                      profileData?.lifetimePoints || 0,
                      Object.entries(TIER_LEVELS).find(([key, details]) => 
                        details.min > (profileData?.lifetimePoints || 0)
                      )?.[1]?.min || currentTier?.max
                    )}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {(profileData?.lifetimePoints || 0).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    /{Object.entries(TIER_LEVELS).find(([key, details]) => 
                      details.min > (profileData?.lifetimePoints || 0)
                    )?.[1]?.min.toLocaleString() || currentTier?.max.toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm">
                To {currentTier?.tier === 'LIFETIME_ELITE' 
                  ? 'Lifetime Elite'
                  : Object.entries(TIER_LEVELS).find(([key, details]) => 
                      details.min > (profileData?.lifetimePoints || 0)
                    )?.[1]?.name || ''}
              </p>
            </div>

            {/* Yearly Points Lock Progress Circle */}
            <div className="text-center">
              <div className="relative inline-block w-32 h-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#eee"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#4263eb"
                    strokeWidth="2"
                    strokeDasharray={`${getProgressPercentage(
                      profileData?.yearlyPointsEarned?.[new Date().getFullYear()] || 0,
                      Math.ceil(currentTier?.min * 0.1)
                    )}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {profileData?.yearlyPointsEarned ? profileData.yearlyPointsEarned[new Date().getFullYear()]?.toLocaleString() : '0'}
                  </span>
                  <span className="text-sm text-gray-500">
                    /{Math.ceil(currentTier?.min * 0.1).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm">Lock Points</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Modal */}
      <LoyaltyModal 
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
      />
    </div>
  );
};

export default RewardsPage;