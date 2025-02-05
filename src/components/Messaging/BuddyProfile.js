// src/components/Messaging/BuddyProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import Badges from '../../components/Profile/Badges';
export const BuddyProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buddyStatus, setBuddyStatus] = useState(null);

  useEffect(() => {
    const fetchProfileAndStatus = async () => {
      if (!userId || !user) return;

      try {
        setLoading(true);
        setError('');

        // Fetch profile data from your existing profiles collection
        const profileDoc = await getDoc(doc(db, 'profiles', userId));
        if (!profileDoc.exists()) {
          setError('User not found');
          return;
        }

        // Get the profile data
        const profileData = profileDoc.data();

        // Check buddy status from current user's profile
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        const buddyList = currentUserDoc.data()?.buddyList || {};
        const currentBuddyStatus = buddyList[userId]?.status || 'none';

        setProfile(profileData);
        setBuddyStatus(currentBuddyStatus);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndStatus();
  }, [userId, user]);

  const handleAddBuddy = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);

      // Update sender's buddy list
      const senderRef = doc(db, 'users', user.uid);
      await updateDoc(senderRef, {
        [`buddyList.${userId}`]: {
          status: 'pending',
          timestamp: serverTimestamp(),
          initiator: true
        }
      });

      // Update recipient's buddy list
      const recipientRef = doc(db, 'users', userId);
      await updateDoc(recipientRef, {
        [`buddyList.${user.uid}`]: {
          status: 'pending',
          timestamp: serverTimestamp(),
          initiator: false
        }
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        type: 'buddy_request',
        fromUser: user.uid,
        fromUserName: user.displayName,
        toUser: userId,
        timestamp: serverTimestamp(),
        read: false
      });

      setBuddyStatus('pending');
    } catch (err) {
      console.error('Error sending buddy request:', err);
      setError('Failed to send buddy request');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      navigate('/messages', { state: { userId } });
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse space-y-4">
            <div className="w-32 h-32 rounded-full bg-gray-200 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-red-500 text-center">{error}</div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-500 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Profile Header */}
        <div className="text-center">
  {profile?.photoURL ? (
    <img
      src={profile.photoURL}
      alt={profile.name}
      className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
    />
  ) : (
    <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-blue-100 flex items-center justify-center">
      <span className="text-4xl text-blue-500">
        {profile?.name ? profile.name[0].toUpperCase() : '?'}
      </span>
    </div>
  )}
  <h2 className="text-2xl font-bold text-gray-900">{profile?.name}</h2>
  {profile?.certificationLevel && (
    <p className="text-blue-600 mt-1">{profile.certificationLevel}</p>
  )}
  <div className="mt-2">
    <Badges
      certificationLevel={profile?.certificationLevel}
      specialties={profile?.specialties}
      numberOfDives={profile?.numberOfDives}
      size="large"
      showSections={true}
    />
  </div>
</div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          {buddyStatus === 'accepted' ? (
            <button
              onClick={handleStartChat}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Message
            </button>
          ) : buddyStatus === 'pending' ? (
            <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded">
              Buddy Request Pending
            </div>
          ) : (
            <button
              onClick={handleAddBuddy}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-green-300"
            >
              Add Buddy
            </button>
          )}
        </div>

        {/* Profile Content */}
        {profile?.hideProfile ? (
          <div className="mt-6 text-center text-gray-500">
            This profile is private
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Contact Information */}
            {!profile?.hideEmail && profile?.email && (
              <p className="text-gray-600">
                <span className="font-medium">Email:</span> {profile.email}
              </p>
            )}
            {!profile?.hidePhone && profile?.phone && (
              <p className="text-gray-600">
                <span className="font-medium">Phone:</span> {profile.phone}
              </p>
            )}
            
            <p className="text-gray-600">
              <span className="font-medium">Total Dives:</span> {profile?.numberOfDives || 0}
            </p>

            {/* Instructor Certifications */}
            {profile?.certificationLevel === "Instructor" && profile?.instructorCertifications?.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Instructor Certifications</h3>
                <div className="space-y-2">
                  {profile.instructorCertifications.map((cert, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {cert.agency} - #{cert.number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialties */}
            {profile?.specialties?.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-500 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};