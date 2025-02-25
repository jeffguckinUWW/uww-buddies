import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import TripMessaging from '../Messaging/trip/TripMessaging';

const TripsSection = ({ user, instructorProfile }) => {
  // Main states
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [notesModalState, setNotesModalState] = useState({
    isOpen: false,
    participant: null
  });
  
  // Modal states
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  // Add the ref to store current trips value
  const tripsRef = useRef([]);
  
  // Participant management states
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Companion management state
  const [companionModalState, setCompanionModalState] = useState({
    isOpen: false,
    participant: null
  });
  
  // New companion form state
  const [newCompanion, setNewCompanion] = useState({
    name: '',
    isDiver: false,
    age: '',
    relationship: '',
    waiverSubmitted: false
  });
  
  // Messaging modal state
  const [messageModalState, setMessageModalState] = useState({
    isOpen: false,
    trip: null,
    recipient: null
  });
  
  // New trip form state
  const [newTrip, setNewTrip] = useState({
    location: "",
    resort: "",
    startDate: "",
    endDate: "",
    description: "",
    requirements: "",
    waiverLink: "https://app.waiverforever.com/pending/dC3UBXG7ZZ1684272159"
  });

  // Stats management state
  // eslint-disable-next-line no-unused-vars
  const [tripStats, setTripStats] = useState({
    totalParticipants: 0,
    totalDivers: 0,
    totalNonDivers: 0
  });

  // Helper Functions
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Ensure dateStr is a string
    if (typeof dateStr !== 'string') {
      // Convert to string if possible
      dateStr = String(dateStr);
    }
    
    // If it's already in YYYY-MM-DD format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Otherwise, clean it up to YYYY-MM-DD
    return dateStr.split('T')[0];
  };

  // Auto-completion check
  const checkAndUpdateTripStatus = useCallback(async (trip) => {
    const endDate = new Date(trip.endDate);
    const dayAfterEnd = new Date(endDate);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    
    const currentDate = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    const easternCurrentDate = new Date(currentDate);
  
    if (easternCurrentDate >= dayAfterEnd && trip.status === 'upcoming') {
      try {
        const tripRef = doc(db, 'trips', trip.id);
        const completedAt = dayAfterEnd;
        
        const updatePromises = trip.participants?.map(async (participant) => {
          const participantRef = doc(db, 'profiles', participant.uid);
          const participantSnap = await getDoc(participantRef);
          
          if (participantSnap.exists()) {
            const participantData = participantSnap.data();
            const updatedTrips = participantData.trips.map(t => 
              t.tripId === trip.id 
                ? { ...t, status: 'completed', completedAt } 
                : t
            );
            
            return updateDoc(participantRef, { trips: updatedTrips });
          }
        });
  
        const notificationPromises = trip.participants?.map(participant =>
          addDoc(collection(db, 'notifications'), {
            type: 'trip_completed',
            toUser: participant.uid,
            fromUser: trip.instructorId,
            fromUserName: trip.instructor?.name || 'Unknown Instructor',
            tripName: trip.location,
            timestamp: serverTimestamp(),
            read: false
          })
        );
  
        await Promise.all([
          updateDoc(tripRef, {
            status: 'completed',
            completedAt
          }),
          ...(updatePromises || []),
          ...(notificationPromises || [])
        ]);
  
        return {
          ...trip,
          status: 'completed',
          completedAt
        };
      } catch (err) {
        console.error('Error auto-completing trip:', err);
        return trip;
      }
    }
    return trip;
  }, []);

  // Load and monitor trips
  useEffect(() => {
    const loadTrips = async () => {
      if (!user?.uid) return;
      
      try {
        const tripsRef = collection(db, 'trips');
        const q = query(tripsRef, where('instructorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        let tripsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        const updatedTripsData = await Promise.all(
          tripsData.map(trip => checkAndUpdateTripStatus(trip))
        );
        
        setTrips(updatedTripsData);
        updatedTripsData.forEach(trip => {
          updateTripStats(trip);
        });
      } catch (err) {
        console.error('Error loading trips:', err);
        setError('Error loading trips');
      } finally {
        setLoading(false);
      }
    };
    
    loadTrips(); // Add this line to call the function
  
    const intervalId = setInterval(async () => {
      if (tripsRef.current.length > 0) {
        try {
          const updatedTrips = await Promise.all(
            tripsRef.current.map(trip => checkAndUpdateTripStatus(trip))
          );
          setTrips(updatedTrips);
        } catch (error) {
          console.error('Error updating trips in interval:', error);
        }
      }
    }, 3600000);
    
    return () => clearInterval(intervalId);
  }, [user, checkAndUpdateTripStatus]);

  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  // Trip Management Functions
  const handleCreateTrip = async () => {
    try {
      const tripData = {
        ...newTrip,
        startDate: newTrip.startDate,     // Already in YYYY-MM-DD from the date input
        endDate: newTrip.endDate,         // Already in YYYY-MM-DD from the date input
        instructorId: user.uid,
        instructor: {
          uid: user.uid,
          email: instructorProfile.email,
          displayName: instructorProfile.name || 'Unnamed Instructor',
          name: instructorProfile.name || 'Unnamed Instructor'
        },
        status: 'upcoming',
        participants: [],
        createdAt: new Date().toISOString().split('T')[0],
        currentParticipants: 0
      };
  
      const docRef = await addDoc(collection(db, 'trips'), tripData);
      const newTripWithId = { id: docRef.id, ...tripData };
      
      setTrips(prevTrips => [...prevTrips, newTripWithId]);
      setIsNewTripModalOpen(false);
      setNewTrip({
        location: "",
        resort: "",
        startDate: "",
        endDate: "",
        description: "",
        requirements: "",
        waiverLink: "https://app.waiverforever.com/pending/dC3UBXG7ZZ1684272159"
      });
    } catch (err) {
      console.error('Error creating trip:', err);
      setError(err.message || 'Failed to create trip');
    }
  };

  const handleUpdateTrip = async () => {
    try {
      if (!editingTrip?.id) {
        throw new Error('No trip selected for editing');
      }
  
      const updatedTrip = {
        ...editingTrip,
        startDate: editingTrip.startDate.split('T')[0],  // Clean to YYYY-MM-DD
        endDate: editingTrip.endDate.split('T')[0]       // Clean to YYYY-MM-DD
      };
  
      const tripRef = doc(db, 'trips', editingTrip.id);
      await updateDoc(tripRef, updatedTrip);
      
      setTrips(prevTrips => 
        prevTrips.map(trip => 
          trip.id === editingTrip.id ? updatedTrip : trip
        )
      );
      
      setIsEditTripModalOpen(false);
      setEditingTrip(null);
    } catch (err) {
      console.error('Error updating trip:', err);
      setError(err.message || 'Failed to update trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (tripSnap.exists()) {
          const tripData = tripSnap.data();
          const updatePromises = [];

          if (tripData.participants?.length > 0) {
            tripData.participants.forEach(participant => {
              const participantRef = doc(db, 'profiles', participant.uid);
              updatePromises.push(
                getDoc(participantRef).then(participantSnap => {
                  if (participantSnap.exists()) {
                    const participantData = participantSnap.data();
                    const updatedTrips = (participantData.trips || []).filter(
                      t => t.tripId !== tripId
                    );
                    return updateDoc(participantRef, { trips: updatedTrips });
                  }
                })
              );
            });
          }

          await Promise.all(updatePromises);
          await deleteDoc(tripRef);
          setTrips(trips.filter(trip => trip.id !== tripId));
          setIsManageModalOpen(false);
          setSelectedTrip(null);
        }
      } catch (err) {
        console.error('Error deleting trip:', err);
        setError('Failed to delete trip');
      }
    }
  };

  // Participant and Companion Management Functions
  const updateTripStats = (trip) => {
    let divers = 0;
    let nonDivers = 0;
    let total = 0;

    trip.participants?.forEach(participant => {
      total++;
      if (participant.isDiver) divers++;
      else nonDivers++;

      participant.companions?.forEach(companion => {
        total++;
        if (companion.isDiver) divers++;
        else nonDivers++;
      });
    });

    setTripStats({
      totalParticipants: total,
      totalDivers: divers,
      totalNonDivers: nonDivers
    });
  };

  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const usersRef = collection(db, 'profiles');
      const searchTermLower = searchTerm.toLowerCase();
      
      const querySnapshot = await getDocs(usersRef);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const isAlreadyInTrip = selectedTrip?.participants?.some(
          participant => participant.uid === doc.id
        );
        
        if (!isAlreadyInTrip &&
            userData.role !== 'instructor' &&
            (userData.email?.toLowerCase().includes(searchTermLower) || 
             userData.name?.toLowerCase().includes(searchTermLower))) {
          users.push({
            uid: doc.id,
            email: userData.email,
            phone: userData.phone || '',
            displayName: userData.name || 'Unnamed User'
          });
        }
      });
      
      setSearchResults(users);
    } catch (err) {
      console.error('Error searching for users:', err);
      setError('Failed to search for users');
    }
  };

  const addParticipantToTrip = async (user) => {
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.data();
  
      const tripRef = doc(db, 'trips', selectedTrip.id);
      const tripSnap = await getDoc(tripRef);
      const tripData = tripSnap.data();
  
      const participantData = {
        uid: user.uid,
        displayName: profileData.name || user.displayName || 'Unnamed User',
        email: user.email,
        phone: profileData.phone || '',
        name: profileData.name || user.displayName || 'Unnamed User',
        isDiver: false,
        waiverSubmitted: false,
        notes: '',
        companions: []
      };
  
      const updatedTrip = {
        ...tripData,
        participants: [...(tripData.participants || []), participantData],
        currentParticipants: (tripData.currentParticipants || 0) + 1
      };
  
      await updateDoc(tripRef, updatedTrip);
  
      if (profileSnap.exists()) {
        const currentTrips = profileData.trips || [];
        await updateDoc(profileRef, {
          trips: [...currentTrips, {
            tripId: selectedTrip.id,
            tripName: tripData.resort || tripData.name,
            status: 'upcoming',
            startDate: tripData.startDate,
            endDate: tripData.endDate,
            location: tripData.location,
            instructorId: tripData.instructorId,
            instructorEmail: tripData.instructor?.email
          }]
        });
  
        await addDoc(collection(db, 'notifications'), {
          type: 'trip_enrollment',
          toUser: user.uid,
          fromUser: instructorProfile.uid,
          fromUserName: instructorProfile.name || 'Unknown Instructor',
          tripName: tripData.location,
          timestamp: serverTimestamp(),
          read: false
        });
      }
      setSelectedTrip({
        ...selectedTrip,
        participants: updatedTrip.participants,
        currentParticipants: updatedTrip.currentParticipants
      });
  
      updateTripStats(updatedTrip);
      setSearchResults([]);
      setParticipantSearch('');
  
    } catch (err) {
      console.error('Error in addParticipantToTrip:', err);
      setError(err.message || 'Failed to add participant to trip');
    }
  };

  const addCompanion = async (participant) => {
    try {
      if (!newCompanion.name) {
        throw new Error('Companion name is required');
      }

      const tripRef = doc(db, 'trips', selectedTrip.id);
      const tripSnap = await getDoc(tripRef);
      const tripData = tripSnap.data();

      const updatedParticipants = tripData.participants.map(p => {
        if (p.uid === participant.uid) {
          return {
            ...p,
            companions: [...(p.companions || []), {
              ...newCompanion,
              id: Date.now().toString(),
              isDiver: newCompanion.isDiver || false,
              waiverSubmitted: false
            }]
          };
        }
        return p;
      });

      const updatedTrip = {
        ...tripData,
        participants: updatedParticipants,
        currentParticipants: tripData.currentParticipants + 1
      };

      await updateDoc(tripRef, updatedTrip);

      setSelectedTrip({
        ...selectedTrip,
        participants: updatedParticipants,
        currentParticipants: selectedTrip.currentParticipants + 1
      });

      updateTripStats(updatedTrip);
      setNewCompanion({ name: '', isDiver: false, age: '', relationship: '' });
      setCompanionModalState({ isOpen: false, participant: null });
    } catch (err) {
      console.error('Error adding companion:', err);
      setError(err.message || 'Failed to add companion');
    }
  };

  const removeCompanion = async (participant, companionId) => {
    try {
      const tripRef = doc(db, 'trips', selectedTrip.id);
      const tripSnap = await getDoc(tripRef);
      const tripData = tripSnap.data();

      const updatedParticipants = tripData.participants.map(p => {
        if (p.uid === participant.uid) {
          return {
            ...p,
            companions: (p.companions || []).filter(c => c.id !== companionId)
          };
        }
        return p;
      });

      const updatedTrip = {
        ...tripData,
        participants: updatedParticipants,
        currentParticipants: tripData.currentParticipants - 1
      };

      await updateDoc(tripRef, updatedTrip);

      setSelectedTrip({
        ...selectedTrip,
        participants: updatedParticipants,
        currentParticipants: selectedTrip.currentParticipants - 1
      });

      updateTripStats(updatedTrip);
    } catch (err) {
      console.error('Error removing companion:', err);
      setError('Failed to remove companion');
    }
  };

  const toggleDiverStatus = async (participantId, isCompanion = false, companionId = null) => {
    try {
      const tripRef = doc(db, 'trips', selectedTrip.id);
      const updatedParticipants = selectedTrip.participants.map(participant => {
        if (isCompanion && participant.uid === participantId) {
          const updatedCompanions = participant.companions.map(companion => {
            if (companion.id === companionId) {
              return { ...companion, isDiver: !companion.isDiver };
            }
            return companion;
          });
          return { ...participant, companions: updatedCompanions };
        } else if (!isCompanion && participant.uid === participantId) {
          return { ...participant, isDiver: !participant.isDiver };
        }
        return participant;
      });

      await updateDoc(tripRef, { participants: updatedParticipants });
      
      setSelectedTrip({
        ...selectedTrip,
        participants: updatedParticipants
      });
    } catch (err) {
      console.error('Error toggling diver status:', err);
      setError('Failed to update diver status');
    }
  };

  const toggleWaiverStatus = async (participantId, isCompanion = false, companionId = null) => {
    try {
      const tripRef = doc(db, 'trips', selectedTrip.id);
      const updatedParticipants = selectedTrip.participants.map(participant => {
        if (isCompanion && participant.uid === participantId) {
          const updatedCompanions = participant.companions.map(companion => {
            if (companion.id === companionId) {
              return { ...companion, waiverSubmitted: !companion.waiverSubmitted };
            }
            return companion;
          });
          return { ...participant, companions: updatedCompanions };
        } else if (!isCompanion && participant.uid === participantId) {
          return { ...participant, waiverSubmitted: !participant.waiverSubmitted };
        }
        return participant;
      });
  
      await updateDoc(tripRef, { participants: updatedParticipants });
      
      setSelectedTrip({
        ...selectedTrip,
        participants: updatedParticipants
      });
    } catch (err) {
      console.error('Error toggling waiver status:', err);
      setError('Failed to update waiver status');
    }
  };

  const handleUpdateParticipantNotes = async (participantId, notes) => {
    try {
      const tripRef = doc(db, 'trips', selectedTrip.id);
      const updatedParticipants = selectedTrip.participants.map(p => {
        if (p.uid === participantId) {
          return { ...p, notes };
        }
        return p;
      });
  
      await updateDoc(tripRef, { participants: updatedParticipants });
      
      setSelectedTrip({
        ...selectedTrip,
        participants: updatedParticipants
      });
      
      setNotesModalState({ isOpen: false, participant: null });
    } catch (err) {
      console.error('Error updating participant notes:', err);
      setError('Failed to update participant notes');
    }
  };

  // Remove participant and their companions
  const removeParticipantFromTrip = async (participantToRemove) => {
    if (window.confirm('Are you sure you want to remove this participant and their companions from the trip?')) {
      try {
        const tripRef = doc(db, 'trips', selectedTrip.id);
        const updatedParticipants = selectedTrip.participants.filter(
          participant => participant.uid !== participantToRemove.uid
        );
        
        const removedCompanionsCount = participantToRemove.companions?.length || 0;
        
        const updatedTrip = { 
          ...selectedTrip, 
          participants: updatedParticipants,
          currentParticipants: (selectedTrip.currentParticipants - (1 + removedCompanionsCount))
        };
        
        await updateDoc(tripRef, { 
          participants: updatedParticipants,
          currentParticipants: updatedTrip.currentParticipants
        });
  
        // Update user's profile
        const userRef = doc(db, 'profiles', participantToRemove.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const updatedTrips = (userData.trips || []).filter(trip => trip.tripId !== selectedTrip.id);
          await updateDoc(userRef, { trips: updatedTrips });
  
          // Create removal notification
          await addDoc(collection(db, 'notifications'), {
            type: 'trip_removal',
            toUser: participantToRemove.uid,
            fromUser: instructorProfile.uid,
            fromUserName: instructorProfile.name || 'Unknown Instructor',
            tripName: selectedTrip.location,
            timestamp: serverTimestamp(),
            read: false
          });
        }

        setTrips(trips.map(trip => 
          trip.id === selectedTrip.id ? updatedTrip : trip
        ));
        setSelectedTrip(updatedTrip);
        updateTripStats(updatedTrip);
      } catch (err) {
        console.error('Error removing participant from trip:', err);
        setError('Failed to remove participant from trip');
      }
    }
  };

  // Loading and Error States
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header with Create Trip Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Trips</h2>
        <button
          onClick={() => setIsNewTripModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create New Trip
        </button>
      </div>

      {/* Grid for Active and Completed Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Trips */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Trips</h3>
          <div className="space-y-4">
            {trips.filter(trip => trip.status === 'upcoming').length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">No upcoming trips yet.</p>
              </div>
            ) : (
              trips
                .filter(trip => trip.status === 'upcoming')
                .map(trip => (
                  <div key={trip.id} className="bg-white border rounded-lg shadow-sm p-4">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold">{trip.location}</h4>
                      <p className="text-sm text-gray-600">
                      {trip.resort} • {formatDate(trip.startDate)} - {formatDate(trip.endDate)}                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <span className="text-sm text-gray-600">
                          Total Participants: {trip.currentParticipants}
                        </span>
                        <span className="text-sm text-blue-600">
                          Divers: {trip.participants?.reduce((total, p) => 
                            total + (p.isDiver ? 1 : 0) + (p.companions?.filter(c => c.isDiver)?.length || 0), 0
                          )}
                        </span>
                        <span className="text-sm text-green-600">
                          Non-Divers: {trip.participants?.reduce((total, p) => 
                            total + (!p.isDiver ? 1 : 0) + (p.companions?.filter(c => !c.isDiver)?.length || 0), 0
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            setSelectedTrip(trip);
                            setIsManageModalOpen(true);
                          }}
                          className="text-sm text-gray-600 hover:text-blue-600"
                        >
                          Manage Trip
                        </button>
                        <button
                          onClick={() => {
                            setMessageModalState({
                              isOpen: true,
                              trip: trip,
                              recipient: null
                            });
                          }}
                          className="text-sm text-gray-600 hover:text-blue-600"
                        >
                          Message Participants
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Completed Trips */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Completed Trips</h3>
          <div className="space-y-4">
            {trips.filter(trip => trip.status === 'completed').length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">No completed trips yet.</p>
              </div>
            ) : (
              trips
                .filter(trip => trip.status === 'completed')
                .map(trip => (
                  <div key={trip.id} className="bg-gray-50 border rounded-lg p-4">
                    <div className="mb-2">
                      <h4 className="text-lg font-semibold">{trip.location}</h4>
                      <p className="text-sm text-gray-600">
                        {trip.resort} • Completed {trip.completedAt ? formatDate(trip.completedAt) : 'Date not available'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <span className="text-sm text-gray-600">
                          Final Participants: {trip.currentParticipants}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          setSelectedTrip(trip);
                          setIsManageModalOpen(true);
                        }}
                        className="text-sm text-gray-600 hover:text-blue-600"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* New Trip Modal */}
      {isNewTripModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Trip</h3>
              <button
                onClick={() => setIsNewTripModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Location"
                className="w-full p-2 border rounded"
                value={newTrip.location}
                onChange={(e) => setNewTrip({...newTrip, location: e.target.value})}
              />
              <input
                type="text"
                placeholder="Resort"
                className="w-full p-2 border rounded"
                value={newTrip.resort}
                onChange={(e) => setNewTrip({...newTrip, resort: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={newTrip.startDate}
                  onChange={(e) => setNewTrip({...newTrip, startDate: e.target.value})}
                />
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={newTrip.endDate}
                  onChange={(e) => setNewTrip({...newTrip, endDate: e.target.value})}
                />
              </div>
              <textarea
                placeholder="Trip Description"
                className="w-full p-2 border rounded"
                rows="3"
                value={newTrip.description}
                onChange={(e) => setNewTrip({...newTrip, description: e.target.value})}
              />
              <textarea
                placeholder="Requirements (e.g., certifications, equipment)"
                className="w-full p-2 border rounded"
                rows="3"
                value={newTrip.requirements}
                onChange={(e) => setNewTrip({...newTrip, requirements: e.target.value})}
              />
              <button
                onClick={handleCreateTrip}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Create Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {isEditTripModalOpen && editingTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Trip</h3>
              <button
                onClick={() => {
                  setIsEditTripModalOpen(false);
                  setEditingTrip(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Location"
                className="w-full p-2 border rounded"
                value={editingTrip.location}
                onChange={(e) => setEditingTrip({...editingTrip, location: e.target.value})}
              />
              <input
                type="text"
                placeholder="Resort"
                className="w-full p-2 border rounded"
                value={editingTrip.resort}
                onChange={(e) => setEditingTrip({...editingTrip, resort: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={editingTrip.startDate.split('T')[0]}
                  onChange={(e) => setEditingTrip({...editingTrip, startDate: e.target.value})}
                />
                <input
                  type="date"
                  className="p-2 border rounded"
                  value={editingTrip.endDate.split('T')[0]}
                  onChange={(e) => setEditingTrip({...editingTrip, endDate: e.target.value})}
                />
              </div>
              <textarea
                placeholder="Trip Description"
                className="w-full p-2 border rounded"
                rows="3"
                value={editingTrip.description}
                onChange={(e) => setEditingTrip({...editingTrip, description: e.target.value})}
              />
              <textarea
                placeholder="Requirements"
                className="w-full p-2 border rounded"
                rows="3"
                value={editingTrip.requirements}
                onChange={(e) => setEditingTrip({...editingTrip, requirements: e.target.value})}
              />
              <button
                onClick={handleUpdateTrip}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Update Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Trip Modal */}
      {isManageModalOpen && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[50]">  {/* Lower z-index */}          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Manage Trip: {selectedTrip.location}</h3>
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setSelectedTrip(null);
                  setSearchResults([]);
                  setParticipantSearch('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Trip Info Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">Trip Information</h4>
                  <button
                    onClick={() => {
                      setEditingTrip(selectedTrip);
                      setIsEditTripModalOpen(true);
                      setIsManageModalOpen(false);  // Add this line to close the Manage modal first
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit Trip
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Location: {selectedTrip.location || 'N/A'}<br />
                  Resort: {selectedTrip.resort || 'N/A'}<br />
                  Start Date: {formatDate(selectedTrip.startDate)}<br />
                  End Date: {formatDate(selectedTrip.endDate)}<br />
                  Total Participants: {selectedTrip.currentParticipants || 0}<br />
                  Requirements: {selectedTrip.requirements || 'None'}<br />
                  Description: {selectedTrip.description || 'No description available'}
                </p>
              </div>

              {/* Participant Management Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold">Manage Participants</h4>
                </div>
                
                {/* Search Participants */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search participants by name or email"
                    className="w-full p-2 border rounded"
                    value={participantSearch}
                    onChange={(e) => {
                      setParticipantSearch(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                      {searchResults.map(user => (
                        <div 
                          key={user.uid}
                          className="p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                        >
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                          <button
                            onClick={() => addParticipantToTrip(user)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Add to Trip
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Participants List */}
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Current Participants</h5>
                  <div className="border rounded max-h-[400px] overflow-y-auto">
                    {selectedTrip.participants?.length > 0 ? (
                      selectedTrip.participants.map(participant => (
                        <div key={participant.uid} className="p-4 border-b last:border-b-0">
                          {/* Main participant */}
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{participant.displayName}</div>
                              <div className="text-sm text-gray-600">
                                {participant.email}
                                {participant.phone && (
                                  <div>Phone: {participant.phone}</div>
                                )}
                              </div>
                              {participant.notes && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Has Notes
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Waiver</label>
                                <input
                                  type="checkbox"
                                  checked={participant.waiverSubmitted}
                                  onChange={() => toggleWaiverStatus(participant.uid)}
                                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Diver</label>
                                <input
                                  type="checkbox"
                                  checked={participant.isDiver}
                                  onChange={() => toggleDiverStatus(participant.uid)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                onClick={() => setNotesModalState({
                                  isOpen: true,
                                  participant: participant
                                })}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                {participant.notes ? 'Edit Notes' : 'Add Notes'}
                              </button>
                              <button
                                onClick={() => setCompanionModalState({
                                  isOpen: true,
                                  participant: participant
                                })}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Add Companion
                              </button>
                              <button
                                onClick={() => removeParticipantFromTrip(participant)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          
                          {/* Companions list */}
                          {participant.companions?.length > 0 && (
                            <div className="ml-4 mt-2 space-y-2">
                              <div className="text-sm font-medium text-gray-600">Traveling With:</div>
                              {participant.companions.map(companion => (
                                <div key={companion.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <div>
                                    <div className="text-sm">
                                      <span className="font-medium">{companion.name}</span>
                                      <span className="text-gray-600 ml-2">
                                        • {companion.relationship}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm text-gray-600">Waiver</label>
                                      <input
                                        type="checkbox"
                                        checked={companion.waiverSubmitted}
                                        onChange={() => toggleWaiverStatus(participant.uid, true, companion.id)}
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-sm text-gray-600">Diver</label>
                                      <input
                                        type="checkbox"
                                        checked={companion.isDiver}
                                        onChange={() => toggleDiverStatus(participant.uid, true, companion.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                    </div>
                                    <button
                                      onClick={() => removeCompanion(participant, companion.id)}
                                      className="text-red-600 hover:text-red-700 text-sm"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-gray-600">
                        No participants added yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trip Actions */}
              <div className="border-t pt-4 space-y-2">
                <button
                  onClick={() => {
                    setMessageModalState({
                      isOpen: true,
                      trip: selectedTrip,
                      recipient: null
                    });
                    setIsManageModalOpen(false);
                  }}
                  className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                >
                  Message All Participants
                </button>
                <button
                  onClick={() => handleDeleteTrip(selectedTrip.id)}
                  className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
                >
                  Delete Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalState.isOpen && notesModalState.participant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Participant Notes</h3>
              <button
                onClick={() => setNotesModalState({ isOpen: false, participant: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <textarea
                placeholder="Add private notes about this participant..."
                className="w-full p-2 border rounded"
                rows="6"
                value={notesModalState.participant.notes || ''}
                onChange={(e) => setNotesModalState({
                  ...notesModalState,
                  participant: { ...notesModalState.participant, notes: e.target.value }
                })}
              />
              <button
                onClick={() => handleUpdateParticipantNotes(
                  notesModalState.participant.uid,
                  notesModalState.participant.notes
                )}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Companion Modal */}
      {companionModalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Travel Companion</h3>
              <button
                onClick={() => setCompanionModalState({ isOpen: false, participant: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Name *"
                  className="w-full p-2 border rounded"
                  value={newCompanion.name}
                  onChange={(e) => setNewCompanion({...newCompanion, name: e.target.value})}
                />
                <span className="text-xs text-gray-500">Required</span>
              </div>

              <div>
                <select
                  className="w-full p-2 border rounded"
                  value={newCompanion.relationship}
                  onChange={(e) => setNewCompanion({...newCompanion, relationship: e.target.value})}
                >
                  <option value="">Select Relationship *</option>
                  <option value="Partner">Partner</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Son/Daughter">Son/Daughter</option>
                  <option value="Other">Other</option>
                </select>
                <span className="text-xs text-gray-500">Required</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Is this companion a diver?</label>
                <input
                  type="checkbox"
                  checked={newCompanion.isDiver}
                  onChange={(e) => setNewCompanion({...newCompanion, isDiver: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => addCompanion(companionModalState.participant)}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Add Companion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Messaging Modal */}
      {messageModalState.isOpen && messageModalState.trip && (
      <TripMessaging
        trip={messageModalState.trip}
        isOpen={messageModalState.isOpen}
        onClose={() => {
          setMessageModalState({
            isOpen: false,
            trip: null,
            recipient: null
          });
        }}
      />
    )}
    </div>
  );
};

export default TripsSection;