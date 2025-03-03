// src/pages/Home.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const TIER_LEVELS = {
  OCEANIC_SILVER: { min: 0, max: 9999, multiplier: 1.0, name: 'Oceanic Silver' },
  MARINER_GOLD: { min: 10000, max: 19999, multiplier: 1.2, name: 'Mariner Gold' },
  NAUTILUS_PLATINUM: { min: 20000, max: 49999, multiplier: 1.5, name: 'Nautilus Platinum' },
  TRIDENT_ELITE: { min: 50000, max: 99999, multiplier: 2.0, name: 'Trident Elite' },
  LIFETIME_ELITE: { min: 100000, max: Infinity, multiplier: 2.0, name: 'Lifetime Elite' }
};

const calculateTier = (lifetimePoints) => {
  return Object.entries(TIER_LEVELS).reduce((acc, [tier, details]) => {
    if (lifetimePoints >= details.min && lifetimePoints <= details.max) {
      return { tier, ...details };
    }
    return acc;
  }, TIER_LEVELS.OCEANIC_SILVER);
};

const Home = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [currentTier, setCurrentTier] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          const profileDoc = await getDoc(profileRef);
          
          // Check if user has a profile - if not, redirect to profile page
          if (!profileDoc.exists() || !profileDoc.data().name) {
            navigate('/profile');
            return;
          }
          
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
  }, [user, navigate]);

  const getFirstName = (fullName) => {
    return fullName ? fullName.split(' ')[0] : 'Diver';
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'OCEANIC_SILVER':
        return 'bg-gray-200';
      case 'MARINER_GOLD':
        return 'bg-yellow-100';
      case 'NAUTILUS_PLATINUM':
        return 'bg-purple-100';
      case 'TRIDENT_ELITE':
      case 'LIFETIME_ELITE':
        return 'bg-blue-100';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <div className="relative h-64">
        <img 
          src="/images/badges/backgroundHome.jpg"
          alt="Diving background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center px-4">
          <h1 className="text-white text-2xl font-bold mb-2">EXPLORE THE UNDERWATER WORLD</h1>
          <button className="bg-white text-blue-600 px-6 py-2 rounded-lg w-40 font-semibold">
            Book a dive
          </button>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="m-4 p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-2">
          Hello, {getFirstName(profileData?.name)}
        </h2>
        <div className={`${getTierColor(currentTier?.tier)} px-3 py-1 rounded-full inline-block mb-2`}>
          <span className="text-sm font-medium">
            {currentTier?.name || 'Oceanic Silver'}
          </span>
        </div>
        
        {/* Clickable Rewards Section */}
        <div 
          onClick={() => navigate('/rewards')}
          className="mt-4 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Your Rewards</h3>
            <ChevronRight className="text-gray-400" size={20} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Lifetime Points</p>
              <p className="text-lg font-semibold">{profileData?.lifetimePoints?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Points</p>
              <p className="text-lg font-semibold">{profileData?.redeemablePoints?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Section */}
      <div className="m-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
        <div>
          <h3 className="font-bold">Love diving?</h3>
          <p className="text-sm">Refer a friend and earn rewards</p>
        </div>
        <button className="text-blue-600 font-semibold">
          Learn more →
        </button>
      </div>
    </div>
  );
};

export default Home;