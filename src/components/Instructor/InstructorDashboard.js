import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import TripSection from './TripSection';
import CourseSection from './CourseSection';
import { generateUniqueSignature } from '../../utils/signatureUtils';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instructorProfile, setInstructorProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('courses');
  const [generatingSignature, setGeneratingSignature] = useState(false);

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
        
            if (!profileData.role || profileData.role !== 'instructor') {
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

  const handleCreateSignature = async () => {
    if (!user?.uid) return;
    
    try {
      setGeneratingSignature(true);
      
      // Generate a unique signature
      const signature = await generateUniqueSignature(db);
      
      // Save to Firestore
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        instructorSignature: {
          code: signature,
          createdAt: new Date().toISOString()
        }
      });
      
      // Update local state
      setInstructorProfile(prev => ({
        ...prev,
        instructorSignature: {
          code: signature,
          createdAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error('Error generating signature:', err);
      setError('Failed to generate signature. Please try again.');
    } finally {
      setGeneratingSignature(false);
    }
  };

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

  // Check if the instructor has a signature
  const hasSignature = instructorProfile?.instructorSignature?.code;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h2>
        </div>

        {/* Signature Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Instructor Signature</h3>
          
          {hasSignature ? (
            <div className="space-y-2">
              <p className="text-gray-600">Your unique instructor signature is:</p>
              <div className="bg-white p-4 rounded-md border border-gray-200 flex items-center">
                <span className="font-mono text-lg font-bold tracking-wider">{instructorProfile.instructorSignature.code}</span>
                <div className="ml-4 text-sm text-gray-500">
                  Use this signature to sign certification documents and training records.
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Created on {new Date(instructorProfile.instructorSignature.createdAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                You need to generate a unique instructor signature to sign certification documents and training records.
              </p>
              <button
                onClick={handleCreateSignature}
                disabled={generatingSignature}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {generatingSignature ? 'Generating...' : 'Create Signature'}
              </button>
            </div>
          )}
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
      </div>
    </div>
  );
};

export default InstructorDashboard;