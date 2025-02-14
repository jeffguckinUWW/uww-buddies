import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import InstructorPinSetup from './InstructorPinSetup';
import TripSection from './TripSection';
import CourseSection from './CourseSection';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instructorProfile, setInstructorProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    console.log('Current instructorProfile:', instructorProfile);
  }, [instructorProfile]);

  useEffect(() => {
    const init = async () => {
      if (user?.uid) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            setInstructorProfile({
              ...profileData,
              uid: user.uid
            });
            setHasPin(!!profileData.instructorPin?.pin);
        
            if (profileData.instructorPin?.pin && (!profileData.role || profileData.role !== 'instructor')) {
              await updateDoc(profileRef, { role: 'instructor' });
            }
          }
        } catch (err) {
          console.error('Error initializing dashboard:', err);
          setError('Error loading instructor dashboard');
        } finally {
          setLoading(false);
        }
      }
    };
    
    init();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasPin) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-yellow-50 p-4 rounded-md mb-4">
          <p className="text-yellow-700">
            Welcome to the Instructor Portal! Please set up your PIN to continue.
          </p>
        </div>
        <InstructorPinSetup onPinSet={() => setHasPin(true)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h2>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b">
          <nav className="flex space-x-8" aria-label="Dashboard sections">
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'courses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trips'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trips
            </button>
          </nav>
        </div>

        {/* Content Sections */}
        {activeTab === 'courses' ? (
          <CourseSection user={user} instructorProfile={instructorProfile} />
        ) : (
          <TripSection user={user} instructorProfile={instructorProfile} />
        )}

        {/* Settings Section */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
          <button
            onClick={() => setHasPin(false)}
            className="text-blue-700 hover:text-blue-900 underline"
          >
            Reset PIN
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;