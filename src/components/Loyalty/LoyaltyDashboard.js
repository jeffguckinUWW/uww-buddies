import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc, getDoc, Timestamp, increment } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

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

  const handleCustomerLookup = async () => {
    if (!barcodeInput) {
      showMessage('Please enter a customer ID');
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const customerRef = doc(db, 'profiles', barcodeInput);
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
  
      let newRedeemablePoints = currentPoints;
      let newLifetimePoints = currentLifetimePoints;
  
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
          newLifetimePoints -= adjustmentAmount;
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
  
      const updatedData = {
        redeemablePoints: newRedeemablePoints,
        lifetimePoints: newLifetimePoints,
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
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="bg-white">
          <CardTitle className="text-gray-900">Loyalty Program Management</CardTitle>
          <div className="text-sm text-gray-500 mt-2">
            Your UID for testing: 
            <code className="bg-gray-100 px-2 py-1 rounded ml-2 select-all text-gray-900">
              {user?.uid}
            </code>
          </div>
        </CardHeader>
        <CardContent className="bg-white">
          <div className="space-y-6">
            {message && (
              <Alert variant={message.type === MESSAGE_TYPES.SUCCESS ? 'default' : 'destructive'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-4">
              <Input
                type="text"
                placeholder="Enter customer UID"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()}
                className="flex-1 bg-white border-gray-200"
              />
              <Button 
                onClick={handleCustomerLookup}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Look Up Customer
              </Button>
            </div>

            {customerData && (
              <div className="space-y-6">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEditModal(true)}
                          className="bg-white hover:bg-gray-50 border-gray-200"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                  <YearlyProgress customerData={customerData} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Earn Points</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(POINT_RATES).map(([category, rate]) => (
                      <div key={category}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {category.charAt(0).toUpperCase() + category.slice(1)} ({rate} points/$)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={purchaseAmounts[category]}
                          onChange={(e) => setPurchaseAmounts({
                            ...purchaseAmounts,
                            [category]: parseFloat(e.target.value) || 0
                          })}
                          className="bg-white border-gray-200"
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

                  <Button 
                    onClick={handlePointsUpdate}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={Object.values(purchaseAmounts).every(amount => amount === 0)}
                  >
                    Process Transaction
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Redeem Points</h3>
                  <div className="flex items-center space-x-4">
                    <Input
                      type="number"
                      min="0"
                      max={customerData.redeemablePoints}
                      placeholder="Points to redeem"
                      className="flex-1 bg-white border-gray-200"
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(e.target.value)}
                    />
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                      Value: ${((pointsToRedeem || 0) / 100).toFixed(2)}
                    </div>
                    <Button
                      onClick={handleRedemption}
                      disabled={!pointsToRedeem || pointsToRedeem > customerData.redeemablePoints}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Redeem Points
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Available points for redemption: {customerData.redeemablePoints}
                  </p>
                </div>

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
        </CardContent>
      </Card>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white border shadow-lg">
          <DialogHeader className="border-b pb-4 bg-white">
            <DialogTitle className="text-gray-900">Adjust Points</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modify customer points and lifetime tier status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4 bg-white">
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
              <Input
                type="number"
                min="0"
                value={pointsAdjustment.amount}
                onChange={(e) => setPointsAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                className="bg-white border-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Adjustment
              </label>
              <Input
                type="text"
                value={pointsAdjustment.reason}
                onChange={(e) => setPointsAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for adjustment"
                className="bg-white border-gray-200"
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
                  className="text-blue-600"
                />
                <span className="text-gray-900">Adjust Lifetime Points (affects tier status)</span>
              </label>
            </div>

            <Button
              onClick={handlePointsAdjustment}
              disabled={!pointsAdjustment.amount || !pointsAdjustment.reason}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyaltyDashboard;