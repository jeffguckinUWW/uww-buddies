import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const InstructorPinSetup = () => {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Check if instructor has existing PIN
  useEffect(() => {
    const checkExistingPin = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().instructorPin?.pin) {
            setHasExistingPin(true);
          }
        } catch (error) {
          console.error('Error checking PIN:', error);
        }
        setLoading(false);
      }
    };

    checkExistingPin();
  }, [user]);

  const validatePin = (pin) => {
    if (pin.length !== 6) {
      return 'PIN must be exactly 6 digits';
    }
    if (!/^\d+$/.test(pin)) {
      return 'PIN must contain only numbers';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate PIN format
    const pinError = validatePin(pin);
  if (pinError) {
    setError(pinError);
    return;
  }


    // Confirm PINs match
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
  
    try {
      const docRef = doc(db, 'profiles', user.uid);
      await updateDoc(docRef, {
        instructorPin: {
          pin: pin,
          lastUpdated: new Date().toISOString()
        },
        role: 'instructor' // Ensure role is set
      });
  
      setSuccess('PIN successfully ' + (hasExistingPin ? 'updated' : 'set'));
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setIsResetting(false);
      setHasExistingPin(true);
    } catch (error) {
      console.error('Error saving PIN:', error);
      setError('Failed to save PIN. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {hasExistingPin ? 'Reset Instructor PIN' : 'Set Up Instructor PIN'}
        </h2>

        {!isResetting && hasExistingPin ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">You already have a PIN set up.</p>
            <button
              onClick={() => setIsResetting(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset PIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {hasExistingPin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Current PIN</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  maxLength={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter current 6-digit PIN"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">New PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter 6-digit PIN"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Confirm 6-digit PIN"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm">
                {success}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {isResetting && (
                <button
                  type="button"
                  onClick={() => setIsResetting(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {hasExistingPin ? 'Update PIN' : 'Set PIN'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InstructorPinSetup;