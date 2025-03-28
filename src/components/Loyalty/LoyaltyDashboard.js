import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc, getDoc, getDocs, Timestamp, increment, collection, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const TIER_LEVELS = {
  OCEANIC_SILVER: { min: 0, max: 9999, multiplier: 1.0, name: 'Oceanic Silver' },
  MARINER_GOLD: { min: 10000, max: 19999, multiplier: 1.2, name: 'Mariner Gold' },
  NAUTILUS_PLATINUM: { min: 20000, max: 49999, multiplier: 1.5, name: 'Nautilus Platinum' },
  TRIDENT_ELITE: { min: 50000, max: 99999, multiplier: 2.0, name: 'Trident Elite' },
  LIFETIME_ELITE: { min: 100000, max: Infinity, multiplier: 2.0, name: 'Lifetime Elite' }
};

const POINT_RATES = {
  equipment: 5,
  service: 10,
  courses: 10,
  trips: 1,
  rentals: 5
};

const MESSAGE_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error'
};

const LoyaltyDashboard = () => {
  const [customerData, setCustomerData] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [giftCardRequests, setGiftCardRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [giftCardNumber, setGiftCardNumber] = useState('');
  const [processingGiftCard, setProcessingGiftCard] = useState(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [pointsAdjustment, setPointsAdjustment] = useState({
    amount: '',
    reason: '',
    type: 'add',
    affectLifetime: false
  });
  const [purchaseAmounts, setPurchaseAmounts] = useState({
    equipment: 0,
    service: 0,
    courses: 0,
    trips: 0,
    rentals: 0
  });
  const { user } = useAuth();

  const fetchGiftCardRequests = useCallback(async () => {
    try {
      const requestsRef = collection(db, 'giftCardRequests');
      const q = query(requestsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      
      setGiftCardRequests(requests);
    } catch (error) {
      console.error('Error fetching gift card requests:', error);
      showMessage('Error fetching gift card requests');
    }
  }, []);  // Empty dependency array since it doesn't use any external values

  useEffect(() => {
    fetchGiftCardRequests();
  }, [fetchGiftCardRequests]);

  const handleGiftCardBalanceAdjustment = async () => {
    if (!selectedGiftCard || !adjustmentAmount) return;
    
    try {
      const amount = parseFloat(adjustmentAmount);
      if (isNaN(amount) || amount <= 0) {
        showMessage('Please enter a valid amount');
        return;
      }
  
      if (amount > selectedGiftCard.amount) {
        showMessage('Adjustment amount cannot be greater than current balance');
        return;
      }
  
      const customerRef = doc(db, 'profiles', customerData.id);
      const customerSnap = await getDoc(customerRef);
      const currentData = customerSnap.data();
  
      // Filter out zero balance cards and update remaining cards
      const updatedGiftCards = currentData.giftCards
        .map(card => {
          if (card.number === selectedGiftCard.number) {
            return {
              ...card,
              amount: card.amount - amount,
              lastUsed: Timestamp.now()
            };
          }
          return card;
        })
        .filter(card => card.amount > 0); // Remove cards with zero balance
  
      // Create transaction record
      const transaction = {
        type: 'gift_card_use',
        date: Timestamp.now(),
        giftCardNumber: selectedGiftCard.number,
        amountUsed: amount,
        remainingBalance: selectedGiftCard.amount - amount,
        processedBy: user.email
      };
  
      // Update profile with new gift card balance and transaction
      await updateDoc(customerRef, {
        giftCards: updatedGiftCards,
        transactions: [transaction, ...(currentData.transactions || [])]
      });
  
      // Update local state
      setCustomerData({
        ...customerData,
        giftCards: updatedGiftCards,
        transactions: [transaction, ...(customerData.transactions || [])]
      });
  
      setShowGiftCardModal(false);
      setSelectedGiftCard(null);
      setAdjustmentAmount('');
      showMessage('Gift card balance updated successfully', MESSAGE_TYPES.SUCCESS);
    } catch (error) {
      console.error('Error adjusting gift card balance:', error);
      showMessage('Error adjusting gift card balance');
    }
  };

  const showMessage = (text, type = MESSAGE_TYPES.ERROR) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const calculateTier = (lifetimePoints) => {
    return Object.entries(TIER_LEVELS).reduce((acc, [tier, details]) => {
      if (lifetimePoints >= details.min && lifetimePoints <= details.max) {
        return { tier, ...details };
      }
      return acc;
    }, TIER_LEVELS.OCEANIC_SILVER);
  };

  const calculatePoints = (amounts, tierMultiplier) => {
    return Object.entries(amounts).reduce((total, [category, amount]) => {
      return total + (amount * POINT_RATES[category] * tierMultiplier);
    }, 0);
  };

  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    if (date?.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return 'Invalid Date';
  };

  const YearlyProgress = ({ customerData }) => {
    const currentYear = new Date().getFullYear();
    const currentTier = calculateTier(customerData.lifetimePoints);
    const requiredYearlyPoints = TIER_LEVELS[currentTier.tier].min * 0.1;
    const pointsThisYear = customerData.yearlyPointsEarned?.[currentYear] || 0;
    const progress = (pointsThisYear / requiredYearlyPoints) * 100;
  
    return (
      <div className="mt-4">
        <h4 className="font-semibold mb-2 text-gray-900">Yearly Progress</h4>
        <div className="bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
        <p className="text-sm mt-1 text-gray-600">
          {pointsThisYear} / {requiredYearlyPoints} points required this year
        </p>
      </div>
    );
  };

  const handleCustomerLookup = async () => {
    if (!barcodeInput) {
      showMessage('Please enter a customer ID or loyalty code');
      return;
    }
    
    const cleanInput = barcodeInput.trim().toUpperCase(); // Make search case-insensitive
    setLoading(true);
    setMessage(null);
    
    try {
      console.log("Looking up customer:", cleanInput);
      
      // First try to find by loyalty code
      const profilesRef = collection(db, 'profiles');
      const q = query(profilesRef, where('loyaltyCode', '==', cleanInput));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Found by loyalty code
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        setCustomerData({
          id: doc.id,
          ...data,
          currentTier: calculateTier(data.lifetimePoints || 0)
        });
        
        showMessage('Customer found by loyalty code', MESSAGE_TYPES.SUCCESS);
        return;
      }
      
      // Fallback to direct UID lookup
      const customerRef = doc(db, 'profiles', cleanInput);
      const customerSnap = await getDoc(customerRef);
      
      if (!customerSnap.exists()) {
        showMessage('Customer not found');
        setCustomerData(null);
        return;
      }
  
      const data = customerSnap.data();
      
      setCustomerData({
        id: customerSnap.id,
        ...data,
        currentTier: calculateTier(data.lifetimePoints || 0)
      });
      showMessage('Customer found successfully', MESSAGE_TYPES.SUCCESS);
    } catch (err) {
      showMessage('Error looking up customer');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessGiftCard = async (request) => {
    if (!giftCardNumber) {
      showMessage('Please enter a gift card number');
      return;
    }
    
    setProcessingGiftCard(true);
    try {
      // Get user's current profile
      const userRef = doc(db, 'profiles', request.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
  
      if (!userData) {
        showMessage('User profile not found');
        return;
      }
  
      if (userData.redeemablePoints < request.pointsRequested) {
        showMessage('User has insufficient points');
        return;
      }
  
      // Create gift card document
      const giftCard = {
        number: giftCardNumber,
        amount: request.amount,
        issueDate: Timestamp.now(),
        status: 'active'
      };
  
      // Update user's points and add gift card
      const giftCards = userData.giftCards || [];
      await updateDoc(userRef, {
        redeemablePoints: increment(-request.pointsRequested),
        giftCards: [...giftCards, giftCard],
        transactions: [{
          type: 'gift_card',
          date: Timestamp.now(),
          points: -request.pointsRequested,
          giftCardAmount: request.amount,
          giftCardNumber: giftCardNumber,
          processedBy: user.email
        }, ...(userData.transactions || [])]
      });
  
      // Update request status
      const requestRef = doc(db, 'giftCardRequests', request.id);
      await updateDoc(requestRef, {
        status: 'completed',
        processedDate: Timestamp.now(),
        processedBy: user.email,
        giftCardNumber: giftCardNumber
      });
  
      showMessage('Gift card processed successfully', MESSAGE_TYPES.SUCCESS);
      setGiftCardNumber('');
      setSelectedRequest(null);
      fetchGiftCardRequests();
    } catch (error) {
      console.error('Error processing gift card:', error);
      showMessage('Error processing gift card');
    } finally {
      setProcessingGiftCard(false);
    }
  };

  const handlePointsUpdate = async () => {
    if (!customerData) return;
    
    try {
      const newPoints = calculatePoints(purchaseAmounts, customerData.currentTier.multiplier);
      const customerRef = doc(db, 'profiles', customerData.id);
      
      const currentYear = new Date().getFullYear();
      const yearlyPointsField = `yearlyPointsEarned.${currentYear}`;
      
      const transaction = {
        type: 'earn',
        date: Timestamp.now(),
        points: newPoints,
        basePoints: calculatePoints(purchaseAmounts, 1),
        multiplier: customerData.currentTier.multiplier,
        amounts: purchaseAmounts,
        processedBy: user.email
      };
  
      const updatedData = {
        lifetimePoints: (customerData.lifetimePoints || 0) + newPoints,
        redeemablePoints: (customerData.redeemablePoints || 0) + newPoints,
        [yearlyPointsField]: increment(newPoints),
        transactions: [transaction, ...(customerData.transactions || [])]
      };
      
      await updateDoc(customerRef, updatedData);
      
      setCustomerData({
        ...customerData,
        ...updatedData,
        currentTier: calculateTier(updatedData.lifetimePoints)
      });
      
      setPurchaseAmounts({
        equipment: 0,
        service: 0,
        courses: 0,
        trips: 0,
        rentals: 0
      });
  
      showMessage(`Successfully added ${newPoints} points`, MESSAGE_TYPES.SUCCESS);
    } catch (err) {
      showMessage('Error updating points');
      console.error('Error:', err);
    }
  };

  const handleRedemption = async () => {
    if (!customerData || !pointsToRedeem) return;
    
    try {
      const pointsAmount = parseFloat(pointsToRedeem);
      if (pointsAmount > customerData.redeemablePoints) {
        showMessage('Not enough points available');
        return;
      }

      const customerRef = doc(db, 'profiles', customerData.id);
      
      const transaction = {
        type: 'redeem',
        date: Timestamp.now(),
        points: pointsAmount,
        processedBy: user.email,
        value: (pointsAmount / 100).toFixed(2)
      };

      const updatedData = {
        redeemablePoints: customerData.redeemablePoints - pointsAmount,
        transactions: [transaction, ...(customerData.transactions || [])]
      };
      
      await updateDoc(customerRef, updatedData);
      
      setCustomerData({
        ...customerData,
        ...updatedData
      });
      
      setPointsToRedeem('');
      showMessage(`Successfully redeemed ${pointsAmount} points`, MESSAGE_TYPES.SUCCESS);
    } catch (err) {
      showMessage('Error processing redemption');
      console.error('Error:', err);
    }
  };

  const handlePointsAdjustment = async () => {
    if (!customerData || !pointsAdjustment.amount || !pointsAdjustment.reason) return;
    
    try {
      const adjustmentAmount = parseInt(pointsAdjustment.amount);
      const customerRef = doc(db, 'profiles', customerData.id);
      const customerSnap = await getDoc(customerRef);
      const currentData = customerSnap.data();
      
      const currentPoints = currentData?.redeemablePoints || 0;
      const currentLifetimePoints = currentData?.lifetimePoints || 0;
      const currentYearlyPoints = currentData?.yearlyPointsEarned?.[new Date().getFullYear()] || 0;
      
      let newRedeemablePoints = currentPoints;
      let newLifetimePoints = currentLifetimePoints;
      let newYearlyPoints = currentYearlyPoints;
  
      if (pointsAdjustment.type === 'add') {
        newRedeemablePoints += adjustmentAmount;
        if (pointsAdjustment.affectLifetime) {
          newLifetimePoints += adjustmentAmount;
        }
      } else {
        if (pointsAdjustment.affectLifetime) {
          if (adjustmentAmount > currentLifetimePoints) {
            showMessage('Cannot subtract more points than available lifetime points');
            return;
          }
          
          const reductionRatio = adjustmentAmount / currentLifetimePoints;
          const yearlyPointsReduction = Math.ceil(currentYearlyPoints * reductionRatio);
          
          newLifetimePoints -= adjustmentAmount;
          newYearlyPoints -= yearlyPointsReduction;
        }
        
        if (adjustmentAmount > currentPoints) {
          if (!pointsAdjustment.affectLifetime) {
            showMessage('Cannot subtract more points than available redeemable points');
            return;
          }
          newRedeemablePoints = 0;
        } else {
          newRedeemablePoints -= adjustmentAmount;
        }
      }
  
      const transaction = {
        type: 'adjustment',
        date: Timestamp.now(),
        points: adjustmentAmount,
        adjustmentType: pointsAdjustment.type,
        affectedLifetime: pointsAdjustment.affectLifetime,
        reason: pointsAdjustment.reason,
        processedBy: user.email
      };
  
      const currentYear = new Date().getFullYear();
      const updatedData = {
        redeemablePoints: newRedeemablePoints,
        lifetimePoints: newLifetimePoints,
        [`yearlyPointsEarned.${currentYear}`]: newYearlyPoints,
        transactions: [transaction, ...(currentData?.transactions || [])]
      };
  
      await updateDoc(customerRef, updatedData);
      
      setCustomerData({
        ...customerData,
        ...updatedData,
        currentTier: calculateTier(newLifetimePoints)
      });
  
      setShowEditModal(false);
      setPointsAdjustment({ amount: '', reason: '', type: 'add', affectLifetime: false });
      
      showMessage(
        `Successfully ${pointsAdjustment.type === 'add' ? 'added' : 'subtracted'} ${adjustmentAmount} points` +
        (pointsAdjustment.affectLifetime ? ' (including lifetime points)' : ''),
        MESSAGE_TYPES.SUCCESS
      );
    } catch (err) {
      showMessage('Error adjusting points');
      console.error('Error:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-100">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold text-gray-900">Loyalty Program Management</h2>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Alert Messages */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === MESSAGE_TYPES.SUCCESS 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Customer Lookup */}
            <div className="flex space-x-4">
              <input
                type="text"
                placeholder="Enter customer UID"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()}
                className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleCustomerLookup}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Look Up Customer
              </button>
            </div>

            {/* Gift Card Requests Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Pending Gift Card Requests</h3>
              <div className="space-y-4">
                {giftCardRequests.map((request) => (
                  <div key={request.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{request.userName}</p>
                        <p className="text-sm text-gray-600">Requested: ${request.amount}</p>
                        <p className="text-sm text-gray-600">Points: {request.pointsRequested}</p>
                        <p className="text-sm text-gray-500">
                          Requested on: {formatDate(request.requestDate)}
                        </p>
                      </div>
                      <div>
                        {selectedRequest?.id === request.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Enter gift card number"
                              value={giftCardNumber}
                              onChange={(e) => setGiftCardNumber(e.target.value)}
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProcessGiftCard(request)}
                                disabled={!giftCardNumber || processingGiftCard}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {processingGiftCard ? 'Processing...' : 'Process'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(null);
                                  setGiftCardNumber('');
                                }}
                                className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Process Request
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {giftCardRequests.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No pending gift card requests</p>
                )}
              </div>
            </div>

            {customerData && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{customerData.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Current Tier</p>
                      <p className="font-medium text-gray-900">{customerData.currentTier.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Point Multiplier</p>
                      <p className="font-medium text-gray-900">{customerData.currentTier.multiplier}x</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Lifetime Points</p>
                      <p className="font-medium text-gray-900">{customerData.lifetimePoints || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Redeemable Points</p>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{customerData.redeemablePoints || 0}</p>
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                  <YearlyProgress customerData={customerData} />
                </div>

                {/* Gift Cards Section */}
                {customerData?.giftCards && customerData.giftCards.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Gift Cards</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {customerData.giftCards.map((card, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                            <p className="font-medium text-gray-900">Card: {card.number}</p>
                              <p className="text-sm text-gray-600">Balance: ${card.amount}</p>
                              {card.lastUsed && (
                                <p className="text-xs text-gray-500">
                                  Last used: {formatDate(card.lastUsed)}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedGiftCard(card);
                                setShowGiftCardModal(true);
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Adjust Balance
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Earn Points Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Earn Points</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(POINT_RATES).map(([category, rate]) => (
                      <div key={category}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {category.charAt(0).toUpperCase() + category.slice(1)} ({rate} points/$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={purchaseAmounts[category]}
                          onChange={(e) => setPurchaseAmounts({
                            ...purchaseAmounts,
                            [category]: parseFloat(e.target.value) || 0
                          })}
                          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100">
                    <h4 className="font-semibold mb-2 text-gray-900">Points Preview</h4>
                    <div className="space-y-1">
                      <p className="text-gray-700">Base Points: {calculatePoints(purchaseAmounts, 1)}</p>
                      <p className="text-gray-700">Tier Multiplier: {customerData.currentTier.multiplier}x</p>
                      <p className="font-medium text-gray-900">
                        Total Points to be earned: {calculatePoints(purchaseAmounts, customerData.currentTier.multiplier)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handlePointsUpdate}
                    disabled={Object.values(purchaseAmounts).every(amount => amount === 0)}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Process Transaction
                  </button>
                </div>

                {/* Redeem Points Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Redeem Points</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="0"
                      max={customerData.redeemablePoints}
                      placeholder="Points to redeem"
                      className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(e.target.value)}
                    />
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                      Value: ${((pointsToRedeem || 0) / 100).toFixed(2)}
                    </div>
                    <button
                      onClick={handleRedemption}
                      disabled={!pointsToRedeem || pointsToRedeem > customerData.redeemablePoints}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Redeem Points
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Available points for redemption: {customerData.redeemablePoints}
                  </p>
                </div>

                {/* Transaction History */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Transaction History</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {customerData.transactions?.map((transaction, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.type === 'adjustment'
                                ? `Points ${transaction.adjustmentType === 'add' ? 'Added' : 'Subtracted'}`
                                : transaction.type === 'earn'
                                  ? 'Points Earned'
                                  : transaction.type === 'gift_card_use'
                                  ? 'Gift Card Used'
                                  : 'Points Redeemed'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              transaction.type === 'earn' || (transaction.type === 'adjustment' && transaction.adjustmentType === 'add')
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {transaction.type === 'earn' || (transaction.type === 'adjustment' && transaction.adjustmentType === 'add')
                                ? '+'
                                : '-'}
                              {transaction.points} points
                            </p>
                            {transaction.type === 'earn' && (
                              <p className="text-sm text-gray-600">
                                Base Points: {transaction.basePoints} × {transaction.multiplier}
                              </p>
                            )}
                            {transaction.type === 'redeem' && (
                              <p className="text-sm text-gray-600">
                                Value: ${transaction.value}
                              </p>
                            )}
                            {transaction.type === 'gift_card_use' && (
                              <p className="text-sm text-gray-600">
                                Card: {transaction.giftCardNumber}
                                <br />
                                Amount Used: ${transaction.amountUsed}
                                <br />
                                Remaining: ${transaction.remainingBalance}
                              </p>
                            )}
                          </div>
                        </div>
                        {transaction.type === 'earn' && transaction.amounts && (
                          <div className="mt-2 text-sm text-gray-600">
                            {Object.entries(transaction.amounts)
                              .filter(([_, amount]) => amount > 0)
                              .map(([category, amount]) => (
                                <div key={category} className="flex justify-between">
                                  <span>{category.charAt(0).toUpperCase() + category.slice(1)}:</span>
                                  <span>${amount}</span>
                                </div>
                              ))}
                          </div>
                        )}
                        {transaction.type === 'adjustment' && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p>Reason: {transaction.reason}</p>
                          </div>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          Processed by: {transaction.processedBy}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Points Adjustment Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="border-b p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Adjust Points</h3>
                  <p className="text-sm text-gray-600">Modify customer points and lifetime tier status</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={pointsAdjustment.type === 'add'}
                    onChange={() => setPointsAdjustment(prev => ({ ...prev, type: 'add' }))}
                    className="text-blue-600"
                  />
                  <span className="text-gray-900">Add Points</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={pointsAdjustment.type === 'subtract'}
                    onChange={() => setPointsAdjustment(prev => ({ ...prev, type: 'subtract' }))}
                    className="text-blue-600"
                  />
                  <span className="text-gray-900">Subtract Points</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={pointsAdjustment.amount}
                  onChange={(e) => setPointsAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={pointsAdjustment.reason}
                  onChange={(e) => setPointsAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason for adjustment"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={pointsAdjustment.affectLifetime}
                    onChange={(e) => setPointsAdjustment(prev => ({ 
                      ...prev, 
                      affectLifetime: e.target.checked 
                    }))}
                    className="text-blue-600 rounded"
                  />
                  <span className="text-gray-900">Adjust Lifetime Points (affects tier status)</span>
                </label>
              </div>
              <button
                onClick={handlePointsAdjustment}
                disabled={!pointsAdjustment.amount || !pointsAdjustment.reason}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gift Card Balance Adjustment Modal */}
      {showGiftCardModal && selectedGiftCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Adjust Gift Card Balance</h3>
                <p className="text-sm text-gray-600">Card: {selectedGiftCard.number}</p>
              </div>
              <button
                onClick={() => {
                  setShowGiftCardModal(false);
                  setSelectedGiftCard(null);
                  setAdjustmentAmount('');
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
                <p className="text-sm text-gray-600 mb-2">Current Balance: ${selectedGiftCard.amount}</p>
                <label className="block text-sm font-medium text-gray-700">Amount Used</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedGiftCard.amount}
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  placeholder="Enter amount used"
                />
                {adjustmentAmount && !isNaN(adjustmentAmount) && (
                  <p className="text-sm text-gray-600 mt-1">
                    New balance will be: ${(selectedGiftCard.amount - parseFloat(adjustmentAmount)).toFixed(2)}
                  </p>
                )}
              </div>

              <button
                onClick={handleGiftCardBalanceAdjustment}
                disabled={!adjustmentAmount || isNaN(adjustmentAmount) || parseFloat(adjustmentAmount) <= 0 || parseFloat(adjustmentAmount) > selectedGiftCard.amount}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Update Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyDashboard;