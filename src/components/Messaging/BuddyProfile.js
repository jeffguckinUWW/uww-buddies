// src/components/Messaging/BuddyProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import Badges from '../../components/Profile/Badges';
import NotificationService from '../../services/NotificationService';

const BuddyProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buddyStatus, setBuddyStatus] = useState(null);
  const [activeSection, setActiveSection] = useState('about');
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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
        const currentUserDoc = await getDoc(doc(db, 'profiles', user.uid));
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
      const senderRef = doc(db, 'profiles', user.uid);
      await updateDoc(senderRef, {
        [`buddyList.${userId}`]: {
          status: 'pending',
          timestamp: serverTimestamp(),
          initiator: true
        }
      });

      // Update recipient's buddy list
      const recipientRef = doc(db, 'profiles', userId);
      await updateDoc(recipientRef, {
        [`buddyList.${user.uid}`]: {
          status: 'pending',
          timestamp: serverTimestamp(),
          initiator: false
        }
      });

      // Create notification
      await NotificationService.createBuddyRequestNotification({
        fromUser: user.uid,
        fromUserName: user.displayName,
        toUser: userId,
        requestId: user.uid
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
  
  const handleRemoveBuddy = async () => {
    if (!user || !userId) return;
    
    if (!window.confirm('Are you sure you want to remove this buddy? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const batch = writeBatch(db);
      
      // Remove buddy from current user's list
      const userRef = doc(db, 'profiles', user.uid);
      batch.update(userRef, {
        [`buddyList.${userId}`]: deleteField()
      });
      
      // Remove current user from buddy's list
      const buddyRef = doc(db, 'profiles', userId);
      batch.update(buddyRef, {
        [`buddyList.${user.uid}`]: deleteField()
      });
      
      await batch.commit();
      
      // Update status locally
      setBuddyStatus('none');
      
    } catch (err) {
      console.error('Error removing buddy:', err);
      setError('Failed to remove buddy');
    } finally {
      setLoading(false);
    }
  };

  // Mobile section tabs
  const renderSectionTabs = () => (
    <div className="mb-3 border-b">
      <div className="flex overflow-x-auto">
        <button
          onClick={() => setActiveSection('about')}
          className={`py-2 px-3 text-xs font-medium whitespace-nowrap ${activeSection === 'about' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          About
        </button>
        <button
          onClick={() => setActiveSection('stats')}
          className={`py-2 px-3 text-xs font-medium whitespace-nowrap ${activeSection === 'stats' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Diving Stats
        </button>
        <button
          onClick={() => setActiveSection('specialties')}
          className={`py-2 px-3 text-xs font-medium whitespace-nowrap ${activeSection === 'specialties' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Specialties
        </button>
        <button
          onClick={() => setActiveSection('trips')}
          className={`py-2 px-3 text-xs font-medium whitespace-nowrap ${activeSection === 'trips' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Dive Trips
        </button>
        <button
          onClick={() => setActiveSection('contact')}
          className={`py-2 px-3 text-xs font-medium whitespace-nowrap ${activeSection === 'contact' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Contact
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-3 md:p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 border border-gray-100">
          <div className="animate-pulse space-y-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 mx-auto"></div>
            <div className="h-5 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-3 md:p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 border border-gray-100">
          <div className="text-red-500 text-center text-sm">{error}</div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 text-sm hover:underline flex items-center justify-center mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-3 md:p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {/* Profile Header */}
        <div className="text-center p-4 border-b border-gray-100">
          <div className="flex flex-col items-center">
            {profile?.photoURL && profile.photoURL.trim() !== '' ? (
              <img
                src={profile.photoURL}
                alt={profile.name || 'User'}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full mb-3 object-cover ring-2 ring-gray-100"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentNode.querySelector('.fallback-avatar').style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full mb-3 bg-blue-50 flex items-center justify-center fallback-avatar ring-2 ring-gray-100 ${profile?.photoURL && profile.photoURL.trim() !== '' ? 'hidden' : ''}`}
            >
              <span className="text-2xl font-medium text-blue-600">
                {profile?.name && profile.name.trim() !== '' ? profile.name.trim()[0].toUpperCase() : '?'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{profile?.name}</h2>
            {profile?.certificationLevel && (
              <p className="text-sm text-blue-600 mb-2">{profile.certificationLevel}</p>
            )}
            <div className="mt-1">
              <Badges
                certificationLevel={profile?.certificationLevel}
                specialties={profile?.specialties}
                numberOfDives={profile?.numberOfDives}
                size="small"
                showSections={false}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`mt-4 flex ${isSmallScreen ? 'flex-col space-y-2' : 'justify-center space-x-3'}`}>
            {buddyStatus === 'accepted' ? (
              <>
                <button
                  onClick={handleStartChat}
                  className={`py-1.5 px-4 bg-blue-50 text-blue-700 rounded text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                >
                  Message
                </button>
                <button
                  onClick={handleRemoveBuddy}
                  className={`py-1.5 px-4 bg-red-50 text-red-700 rounded text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                  disabled={loading}
                >
                  Remove Buddy
                </button>
              </>
            ) : buddyStatus === 'pending' ? (
              <div className="py-1.5 px-4 bg-gray-50 text-gray-600 rounded text-sm border border-gray-200">
                Buddy Request Pending
              </div>
            ) : (
              <button
                onClick={handleAddBuddy}
                disabled={loading}
                className={`py-1.5 px-4 bg-blue-50 text-blue-700 rounded text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors disabled:bg-gray-50 disabled:text-gray-400 ${isSmallScreen ? 'w-full' : ''}`}
              >
                Add Buddy
              </button>
            )}
          </div>
        </div>

        {/* Mobile Section Navigation */}
        {isSmallScreen && renderSectionTabs()}

        {/* Profile Content */}
        {profile?.hideProfile ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            This profile is private
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* About Me - Default section on mobile */}
            {(!isSmallScreen || activeSection === 'about') && profile?.bio && (
              <div className={`${isSmallScreen ? '' : 'border-b border-gray-100 pb-4'}`}>
                <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">About Me</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>

                {/* Instructor Certifications */}
                {profile?.certificationLevel === "Instructor" && profile?.instructorCertifications?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h4 className="text-xs text-gray-500 mb-2">Instructor Certifications</h4>
                    <div className="space-y-1">
                      {profile.instructorCertifications.map((cert, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block mr-2 mb-2">
                          {cert.agency} #{cert.number}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Diving Stats */}
            {(!isSmallScreen || activeSection === 'stats') && !profile?.hideStats && profile?.divingStats && (
              <div className={`${isSmallScreen ? '' : 'border-b border-gray-100 pb-4'}`}>
                <h3 className="text-sm uppercase font-semibold text-gray-500 mb-3 tracking-wider">Diving Statistics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">{profile.divingStats.totalDives || 0}</div>
                    <div className="text-xs text-gray-600">Total Dives</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">{profile.divingStats.maxDepth || 0}ft</div>
                    <div className="text-xs text-gray-600">Max Depth</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">{profile.divingStats.totalTime || 0}h</div>
                    <div className="text-xs text-gray-600">Bottom Time</div>
                  </div>
                </div>
              </div>
            )}

            {/* Specialties */}
            {(!isSmallScreen || activeSection === 'specialties') && profile?.specialties?.length > 0 && (
              <div className={`${isSmallScreen ? '' : 'border-b border-gray-100 pb-4'}`}>
                <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dive Trips */}
            {(!isSmallScreen || activeSection === 'trips') && (
              <div className={`${isSmallScreen ? '' : 'border-b border-gray-100 pb-4'}`}>
                <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">Dive Trips</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  {profile?.favoritePlace && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="font-medium text-gray-700 mb-1">Favorite Dive Location</p>
                      <p>{profile.favoritePlace}
                        {profile.favoriteDivesite && (
                          <span className="text-blue-600"> - {profile.favoriteDivesite}</span>
                        )}
                      </p>
                    </div>
                  )}
                  {profile?.diveTrips?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Trip History</p>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        {profile.diveTrips
                          .sort((a, b) => b.year - a.year)
                          .map((trip, index) => (
                            <div key={index} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                              <span className="font-medium">{trip.year}</span>
                              <span>{trip.location}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Information */}
            {(!isSmallScreen || activeSection === 'contact') && (
              <div>
                <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">Contact Information</h3>
                {buddyStatus === 'accepted' ? (
                  <div className="space-y-2">
                    {!profile?.hideEmail && profile?.email && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {profile.email}
                      </p>
                    )}
                    {!profile?.hidePhone && profile?.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {profile.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Contact details visible after connecting as buddies
                  </p>
                )}
                {!profile?.hideLocation && (profile?.city || profile?.state) && (
                  <p className="text-sm text-gray-600 flex items-center mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {[profile.city, profile.state].filter(Boolean).join(', ')}
                  </p>
                )}

                {/* Social Links */}
                {!profile?.privacySettings?.hideSocial && profile?.socialLinks && 
                Object.values(profile.socialLinks).some(Boolean) && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h4 className="text-xs text-gray-500 mb-2">Connect On</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.socialLinks).map(([platform, url]) => (
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Back Button - Fixed at bottom on mobile */}
        <div className={`${isSmallScreen ? 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-10' : 'mt-2 text-center p-4 border-t border-gray-100'}`}>
          <button
            onClick={() => navigate(-1)}
            className={`text-blue-600 hover:bg-blue-50 ${isSmallScreen ? 'w-full py-1.5 rounded text-sm font-medium border border-blue-200' : 'text-sm hover:underline'}`}
          >
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </div>
          </button>
        </div>
      </div>

      {/* Add bottom padding to account for fixed button on mobile */}
      {isSmallScreen && <div className="h-16"></div>}
    </div>
  );
};

export { BuddyProfile };