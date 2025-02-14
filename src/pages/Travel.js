import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import TripMessaging from '../components/Messaging/trip/TripMessaging';

const Travel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trips, setTrips] = useState([]);
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [tripDetails, setTripDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const cleanupTripData = useCallback(async (tripData) => {
    if (!tripData || tripData.length === 0) return [];
  
    const updatedTrips = [];
    const invalidTrips = [];
  
    for (const trip of tripData) {
      try {
        const tripRef = doc(db, 'trips', trip.tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (!tripSnap.exists()) {
          invalidTrips.push(trip.tripId);
          continue;
        }
  
        const firestoreTrip = tripSnap.data();
  
        updatedTrips.push({
          ...trip,
          ...firestoreTrip,
          tripId: trip.tripId,
          currentParticipants: firestoreTrip.participants?.length || 0,
          instructor: firestoreTrip.instructor,
          requirements: firestoreTrip.requirements,
          description: firestoreTrip.description,
          status: firestoreTrip.status || trip.status,
          maxParticipants: firestoreTrip.maxParticipants || trip.maxParticipants
        });
  
      } catch (err) {
        console.error('Error checking trip:', err);
        updatedTrips.push(trip);
      }
    }
  
    if (invalidTrips.length > 0) {
      try {
        const userRef = doc(db, 'profiles', user.uid);
        await updateDoc(userRef, {
          trips: updatedTrips
        });
      } catch (err) {
        console.error('Error updating profile:', err);
      }
    }
  
    return updatedTrips;
  }, [user?.uid]);

  useEffect(() => {
    const fetchTrips = async () => {
      if (user?.uid) {
        try {
          const userRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const tripData = userData.trips || [];
            const validTrips = await cleanupTripData(tripData);
            setTrips(validTrips);
          }
        } catch (err) {
          console.error('Error fetching trips:', err);
          setError('Error loading trip data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTrips();
  }, [user, cleanupTripData]);

  const fetchTripDetails = async (tripId) => {
    if (!tripId) {
      setDetailsError('Invalid trip ID');
      setDetailsLoading(false);
      return;
    }
    
    try {
      setDetailsLoading(true);
      setDetailsError('');
      
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (tripSnap.exists()) {
        const data = tripSnap.data();
        setTripDetails(data);
      } else {
        setDetailsError('Trip not found');
      }
    } catch (err) {
      console.error('Error fetching trip details:', err);
      setDetailsError('Failed to load trip details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleDetails = async (tripId) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
      setTripDetails(null);
    } else {
      setExpandedTripId(tripId);
      await fetchTripDetails(tripId);
    }
  };

  const TripCard = ({ trip, isExpanded, onToggle, details, isLoading, error, currentUserId }) => {
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const getDiverCounts = (participants) => {
      let divers = 0;
      let nonDivers = 0;
  
      participants?.forEach(participant => {
        if (participant.isDiver) divers++;
        else nonDivers++;
  
        participant.companions?.forEach(companion => {
          if (companion.isDiver) divers++;
          else nonDivers++;
        });
      });
  
      return { divers, nonDivers };
    };
  
    const { divers, nonDivers } = getDiverCounts(trip.participants);
  
    const WaiverStatus = ({ isSubmitted }) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isSubmitted 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isSubmitted ? 'Waiver Accepted' : 'Waiver Required'}
      </span>
    );
  
    return (
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {/* Trip Header */}
        <div className="p-4">
          <div className="mb-2">
            <h4 className="text-lg font-semibold">{trip.location}</h4>
            <p className="text-sm text-gray-600">
              {trip.resort} • {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </p>
            
            {/* Prominent Waiver Link */}
            <div className="mt-3 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-2">Important Document Required:</div>
              <a 
                href={trip.waiverLink || "https://app.waiverforever.com/pending/dC3UBXG7ZZ1684272159"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium p-2 bg-white rounded-md border border-blue-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Travel Waiver
              </a>
            </div>
  
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Total Participants: {trip.currentParticipants}
              </span>
              <span className="text-sm text-blue-600">
                Divers: {divers}
              </span>
              <span className="text-sm text-green-600">
                Non-Divers: {nonDivers}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                trip.status === 'upcoming' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {trip.status}
              </span>
            </div>
          </div>
  
          <div className="flex justify-between items-center">
            <button 
              onClick={onToggle}
              className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1"
            >
              {isExpanded ? 'Hide Details' : 'View Details'}
            </button>
  
            <button
              onClick={() => setIsMessagingOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Trip Messages
            </button>
          </div>
        </div>
  
        {/* Expandable Section */}
        {isExpanded && (
          <div className="border-t bg-gray-50">
            {isLoading ? (
              <div className="p-4 text-center text-gray-600">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">{error}</div>
            ) : trip ? (
              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Description</h5>
                    <p className="text-sm text-gray-600">{trip.description}</p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Requirements</h5>
                    <p className="text-sm text-gray-600">{trip.requirements}</p>
                  </div>
  
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Trip Leader</h5>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{trip.instructor?.displayName}</span>
                        <span className="text-sm text-gray-600">{trip.instructor?.email}</span>
                      </div>
                    </div>
                  </div>
  
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Participants</h5>
                    <div className="space-y-3">
                      {trip.participants?.map((participant) => {
                        const isCurrentUser = participant.uid === currentUserId;
                        
                        return (
                          <div key={participant.uid} className="border-b pb-3 last:border-b-0">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{participant.displayName}</span>
                                {isCurrentUser && (
                                  <span className="ml-2 text-sm text-gray-500">(You)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${participant.isDiver ? 'text-blue-600' : 'text-green-600'}`}>
                                  {participant.isDiver ? 'Diver' : 'Non-Diver'}
                                </span>
                                {isCurrentUser && (
                                  <WaiverStatus isSubmitted={participant.waiverSubmitted} />
                                )}
                              </div>
                            </div>
  
                            {participant.companions?.length > 0 && (
                              <div className="mt-2 ml-4">
                                <div className="text-sm text-gray-600">
                                  Traveling With:
                                </div>
                                <div className="ml-2 space-y-1">
                                  {participant.companions.map((companion) => (
                                    <div key={companion.id} className="text-sm flex justify-between items-center">
                                      <span>
                                        {companion.name}
                                        {isCurrentUser && companion.relationship && (
                                          <span className="text-gray-500">
                                            {` • ${companion.relationship}`}
                                          </span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className={companion.isDiver ? 'text-blue-600' : 'text-green-600'}>
                                          {companion.isDiver ? 'Diver' : 'Non-Diver'}
                                        </span>
                                        {isCurrentUser && (
                                          <WaiverStatus isSubmitted={companion.waiverSubmitted} />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600">No details available</div>
            )}
          </div>
        )}
  
        {/* Trip Messaging Modal */}
        {isMessagingOpen && (
          <TripMessaging
            trip={{
              ...trip,
              id: trip.tripId
            }}
            isOpen={isMessagingOpen}
            onClose={() => setIsMessagingOpen(false)}
          />
        )}
      </div>
    );
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

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Travel</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Trips */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Trips</h3>
            <div className="space-y-4">
              {trips.filter(trip => trip.status === 'upcoming').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No upcoming trips.</p>
                </div>
              ) : (
                trips
                  .filter(trip => trip.status === 'upcoming')
                  .map(trip => (
                    <TripCard
                      key={trip.tripId}
                      trip={trip}
                      isExpanded={expandedTripId === trip.tripId}
                      onToggle={() => handleToggleDetails(trip.tripId)}
                      details={expandedTripId === trip.tripId ? tripDetails : null}
                      isLoading={detailsLoading}
                      error={detailsError}
                      currentUserId={user.uid}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Past Trips */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Past Trips</h3>
            <div className="space-y-4">
              {trips.filter(trip => trip.status === 'completed').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No past trips.</p>
                </div>
              ) : (
                trips
                  .filter(trip => trip.status === 'completed')
                  .map(trip => (
                    <TripCard
                      key={trip.tripId}
                      trip={trip}
                      isExpanded={expandedTripId === trip.tripId}
                      onToggle={() => handleToggleDetails(trip.tripId)}
                      details={expandedTripId === trip.tripId ? tripDetails : null}
                      isLoading={detailsLoading}
                      error={detailsError}
                      currentUserId={user.uid}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Travel;