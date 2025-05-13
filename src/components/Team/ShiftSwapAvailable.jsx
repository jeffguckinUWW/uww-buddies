import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust the import path as needed
import { useAuth } from '../../context/AuthContext'; // Adjust the import path as needed
import { checkForScheduleConflicts, checkForTimeOff } from '../../utils/scheduleConflictUtils';
import LoadingSpinner from '../ui/LoadingSpinner';

// Embed the updateScheduleAfterSwap function directly in this file
// to avoid import errors
const updateScheduleAfterSwap = async (swapRequestId, acceptorId) => {
  try {
    // 1. Get the swap request details
    const swapRequestRef = doc(db, 'shiftSwapRequests', swapRequestId);
    const swapRequestSnap = await getDoc(swapRequestRef);
    
    if (!swapRequestSnap.exists()) {
      console.error('Swap request not found');
      return false;
    }
    
    const swapRequest = swapRequestSnap.data();
    
    // 2. Verify the swap request is in 'accepted' status
    if (swapRequest.status !== 'accepted') {
      console.error('Cannot update schedule for a swap request that is not accepted');
      return false;
    }
    
    // 3. Get the original shift from the schedule
    const shiftRef = doc(db, 'schedules', swapRequest.originalShiftId);
    const shiftSnap = await getDoc(shiftRef);
    
    if (!shiftSnap.exists()) {
      console.error('Original shift not found in schedule');
      return false;
    }
    
    // 4. Update the shift with the new staff member
    await updateDoc(shiftRef, {
      staffId: acceptorId,
      updatedAt: serverTimestamp(),
      swappedFrom: swapRequest.requestorId,
      swapRequestId: swapRequestId
    });
    
    // 5. Update the swap request to completed status
    await updateDoc(swapRequestRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });
    
    // 6. Add an entry to the swap history collection (optional)
    await addDoc(collection(db, 'shiftSwapHistory'), {
      requestId: swapRequestId,
      originalShiftId: swapRequest.originalShiftId,
      requestorId: swapRequest.requestorId,
      requestorName: swapRequest.requestorName || '',
      acceptorId: acceptorId,
      acceptorName: '', // This could be populated if needed
      date: swapRequest.date,
      shift: swapRequest.shift,
      completedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating schedule after swap:', error);
    return false;
  }
};

const ShiftSwapAvailable = () => {
  const [availableRequests, setAvailableRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const { user } = useAuth(); // Using user from auth context

  // Find user profile using multiple methods
  const findUserProfile = useCallback(async () => {
    if (!user) return null;
    
    try {
      // Method 1: Try to find by 'uid' field
      const profileQuery = query(
        collection(db, 'profiles'),
        where('uid', '==', user.uid)
      );
      const profileSnapshot = await getDocs(profileQuery);
      
      if (!profileSnapshot.empty) {
        return {
          id: profileSnapshot.docs[0].id,
          ...profileSnapshot.docs[0].data()
        };
      }
      
      // Method 2: Try to get directly by document ID
      const directProfileRef = doc(db, 'profiles', user.uid);
      const directProfileSnap = await getDoc(directProfileRef);
      
      if (directProfileSnap.exists()) {
        return {
          id: directProfileSnap.id,
          ...directProfileSnap.data()
        };
      }
      
      // Method 3: Try by email if available
      if (user.email) {
        const emailProfileQuery = query(
          collection(db, 'profiles'),
          where('email', '==', user.email)
        );
        const emailProfileSnapshot = await getDocs(emailProfileQuery);
        
        if (!emailProfileSnapshot.empty) {
          return {
            id: emailProfileSnapshot.docs[0].id,
            ...emailProfileSnapshot.docs[0].data()
          };
        }
      }
      
      // No profile found
      console.error('No profile found for user:', user.uid);
      return null;
    } catch (err) {
      console.error('Error finding user profile:', err);
      return null;
    }
  }, [user]);

  // Wrap fetchAvailableRequests in useCallback to avoid infinite loops
  const fetchAvailableRequests = useCallback(async (profileId) => {
    if (!user || !profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Query for pending requests that aren't from the current user
      const requestsQuery = query(
        collection(db, 'shiftSwapRequests'),
        where('status', '==', 'pending'),
        where('requestorId', '!=', profileId)
      );
      
      const querySnapshot = await getDocs(requestsQuery);
      
      // Process the documents and add additional data
      const requests = [];
      for (const docSnapshot of querySnapshot.docs) {
        const requestData = docSnapshot.data();
        
        // Get requestor's name (assuming you have a users collection with display names)
        const requestorDoc = await getDoc(doc(db, 'profiles', requestData.requestorId));
        const requestorName = requestorDoc.exists() ? 
          requestorDoc.data().displayName || requestorDoc.data().name || 'Unknown User' : 'Unknown User';
        
        // Add to our requests array with additional data
        requests.push({
          id: docSnapshot.id,
          ...requestData,
          requestorName,
        });
      }
      
      setAvailableRequests(requests);
    } catch (err) {
      console.error('Error fetching available requests:', err);
      setError('Failed to load available swap requests. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user]); // Dependency on user

  // Load user profile on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      const profile = await findUserProfile();
      setUserProfile(profile);
      
      if (profile) {
        fetchAvailableRequests(profile.id);
      } else {
        setLoading(false);
      }
    };
    
    loadUserProfile();
  }, [findUserProfile, fetchAvailableRequests]); // Added fetchAvailableRequests to dependency array

  const handleAcceptRequest = async (requestId) => {
    if (!user || !userProfile) {
      setError('You must be logged in with a valid profile to accept shift swap requests');
      return;
    }
  
    // Get the request details
    const request = availableRequests.find(r => r.id === requestId);
    if (!request) {
      setError('Could not find the requested shift');
      return;
    }
    
    try {
      // Parse the date from the request
      const requestDate = request.date.seconds 
        ? new Date(request.date.seconds * 1000) 
        : new Date(request.date);
      
      // Parse the shift time from string (e.g., "9am - 5pm")
      const [startTimeStr, endTimeStr] = request.shift.split(' - ');
      
      // Helper function to convert from 12-hour to 24-hour format
      const convertTo24Hour = (timeStr) => {
        const isPM = timeStr.toLowerCase().includes('pm');
        const is12 = timeStr.toLowerCase().startsWith('12');
        let [hours, minutesPart] = timeStr.replace(' AM', '').replace(' PM', '').replace('am', '').replace('pm', '').split(':');
        
        hours = parseInt(hours, 10);
        if (isPM && !is12) hours += 12;
        if (!isPM && is12) hours = 0;
        
        let minutes = 0;
        if (minutesPart) {
          minutes = parseInt(minutesPart, 10);
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      const startTime = convertTo24Hour(startTimeStr);
      const endTime = convertTo24Hour(endTimeStr);
      
      // Check for existing shift conflicts
      const shiftConflicts = await checkForScheduleConflicts(
        userProfile.id,
        requestDate,
        startTime,
        endTime
      );
      
      // Check for time-off conflicts
      const timeOffRequest = await checkForTimeOff(
        userProfile.id,
        requestDate
      );
      
      // If any conflicts, show warning
      if (shiftConflicts.length > 0 || timeOffRequest) {
        let conflictMessage = 'Warning: Taking this shift may create conflicts:\n\n';
        
        if (shiftConflicts.length > 0) {
          conflictMessage += '- You already have a shift scheduled during this time\n';
        }
        
        if (timeOffRequest) {
          conflictMessage += `- You have approved time-off on this date (${timeOffRequest.reason})\n`;
        }
        
        conflictMessage += '\nDo you still want to accept this shift swap?';
        
        if (!window.confirm(conflictMessage)) {
          return;
        }
      }
      
      if (!window.confirm('Are you sure you want to accept this shift swap request?')) {
        return;
      }
      
      // Update the swap request status
      const requestRef = doc(db, 'shiftSwapRequests', requestId);
      await updateDoc(requestRef, {
        status: 'accepted',
        acceptorId: userProfile.id,
        acceptorName: userProfile.name || userProfile.displayName || 'Unknown User',
        acceptedAt: new Date()
      });
      
      // Update the schedule 
      await updateScheduleAfterSwap(requestId, userProfile.id);
      
      // Refresh the list
      fetchAvailableRequests(userProfile.id);
      
      // Show success message
      alert('Shift swap request accepted successfully!');
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept the shift swap request. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  // Check if user is authenticated before rendering the main component
  if (!user) {
    return <div className="text-center p-4 text-amber-600">Please log in to view available shift swaps</div>;
  }

  // Check if user profile was found
  if (!userProfile) {
    return <div className="text-center p-4 text-amber-600">Your user profile could not be found. Please contact an administrator.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Available Shift Swaps</h2>
      
      {availableRequests.length === 0 ? (
        <p className="text-gray-500">No pending shift swap requests available.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableRequests.map((request) => (
            <div 
              key={request.id} 
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                <div>
                  <h3 className="font-semibold">{request.requestorName}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(request.date.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs inline-block mt-2 sm:mt-0 w-fit">
                  Pending
                </span>
              </div>
              
              <div className="mb-4">
                <p className="text-sm">
                  <span className="font-medium">Shift: </span> 
                  {request.shift}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Reason: </span> 
                  {request.reason || 'No reason provided'}
                </p>
                {request.notes && (
                  <p className="text-sm">
                    <span className="font-medium">Notes: </span> 
                    {request.notes}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => handleAcceptRequest(request.id)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors touch-target"
              >
                Accept Shift
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShiftSwapAvailable;