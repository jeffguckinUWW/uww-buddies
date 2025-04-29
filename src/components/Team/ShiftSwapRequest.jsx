// src/components/Team/ShiftSwapRequest.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { 
  Calendar, 
  Clock, 
  AlarmClock,
  FileText
} from 'lucide-react';
import SimpleDialog from '../ui/SimpleDialog';
import { getDateKey, formatDate, } from '../../utils/dateUtils';
import { useUserProfile } from '../../hooks/useUserProfile';
import { checkForTimeOff } from '../../utils/scheduleConflictUtils';
import LoadingSpinner from '../ui/LoadingSpinner';

const ShiftSwapRequest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const { userProfile: currentUserProfile, error: profileError, profileLoaded } = useUserProfile();

// Combine errors if needed
const [error, setError] = useState(null);
useEffect(() => {
  if (profileError) {
    setError(profileError);
  }
}, [profileError]);
  
  // State for upcoming shifts
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  
  // State for swap requests
  const [mySwapRequests, setMySwapRequests] = useState([]);
  
  // State for request dialog
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  
  
  // Fetch my swap requests (wrapped in useCallback to avoid infinite loop)
  const fetchMySwapRequests = useCallback(async () => {
    if (!user || !currentUserProfile || !currentUserProfile.id) {
      return [];
    }
    
    try {
      const requestsQuery = query(
        collection(db, 'shiftSwapRequests'),
        where('requestorId', '==', currentUserProfile.id),
        orderBy('requestedAt', 'desc')
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsList = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMySwapRequests(requestsList);
      return requestsList;
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      return [];
    }
  }, [user, currentUserProfile]);
  
  // Fetch upcoming shifts for the current user
  useEffect(() => {
    const fetchUpcomingShifts = async () => {
      if (!profileLoaded) return;
      
      if (!user || !currentUserProfile) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get today's date
        const today = new Date();
        
        // Get dates for the next 14 days
        const nextTwoWeeks = [];
        for (let i = 0; i < 14; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          nextTwoWeeks.push(getDateKey(date));
        }
        
        // Firebase doesn't support 'in' with more than 10 values
        const batch1 = nextTwoWeeks.slice(0, 10);
        const batch2 = nextTwoWeeks.slice(10);
        
        const shifts = [];
        
        // Fetch first batch
        const query1 = query(
          collection(db, 'schedules'),
          where('date', 'in', batch1),
          where('staffId', '==', currentUserProfile.id)
        );
        
        const snapshot1 = await getDocs(query1);
        snapshot1.docs.forEach(doc => {
          shifts.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Fetch second batch if needed
        if (batch2.length > 0) {
          const query2 = query(
            collection(db, 'schedules'),
            where('date', 'in', batch2),
            where('staffId', '==', currentUserProfile.id)
          );
          
          const snapshot2 = await getDocs(query2);
          snapshot2.docs.forEach(doc => {
            shifts.push({
              id: doc.id,
              ...doc.data()
            });
          });
        }
        
        // Sort shifts by date
        shifts.sort((a, b) => a.date.localeCompare(b.date));
        
        setUpcomingShifts(shifts);
        
        // Also fetch any existing swap requests for these shifts
        await fetchMySwapRequests();
      } catch (err) {
        console.error('Error fetching upcoming shifts:', err);
        setError('Failed to load upcoming shifts');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpcomingShifts();
  }, [currentUserProfile, fetchMySwapRequests, profileLoaded, user]);
  
  // Check if a shift already has a pending swap request
  const hasExistingRequest = (shiftId) => {
    return mySwapRequests.some(
      request => request.originalShiftId === shiftId && 
                (request.status === 'pending' || request.status === 'accepted')
    );
  };
  
  // Open request dialog for a shift
  const handleOpenRequestDialog = (shift) => {
    setSelectedShift(shift);
    setRequestNote('');
    setShowRequestDialog(true);
  };
  
  // Submit a swap request
  const submitSwapRequest = async () => {
    if (!selectedShift || !user || !currentUserProfile) {
      setError('You must be logged in to create a swap request');
      return;
    }
    
    try {
      setLoading(true);

      const timeOffRequest = await checkForTimeOff(
        currentUserProfile.id,
        new Date(selectedShift.date)
      );
      
      if (timeOffRequest) {
        // Show warning about time-off conflict
        alert(`Warning: You have approved time-off on this date (${timeOffRequest.reason}). ` +
              `You may want to cancel your time-off request instead of requesting a shift swap.`);
        
        // Ask user if they want to proceed anyway
        if (!window.confirm('Do you want to proceed with the shift swap request anyway?')) {
          setLoading(false);
          return;
        }
      }
      
      // Create new swap request in Firestore
      await addDoc(collection(db, 'shiftSwapRequests'), {
        originalShiftId: selectedShift.id,
        requestorId: currentUserProfile.id,
        requestorName: currentUserProfile.name || 'Unknown',
        date: selectedShift.date,
        shift: selectedShift.shift,
        requestNote,
        status: 'pending',
        requestedAt: serverTimestamp(),
        acceptorId: '',
        acceptorName: '',
        acceptedAt: null,
        completedAt: null
      });
      
      // Close dialog and refresh requests
      setShowRequestDialog(false);
      await fetchMySwapRequests();
      
      // Show success message
      alert('Shift swap request created successfully!');
    } catch (err) {
      console.error('Error creating swap request:', err);
      setError('Failed to create swap request');
    } finally {
      setLoading(false);
    }
  };
  
  // Cancel a swap request
  const cancelSwapRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this swap request?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete the request document
      await deleteDoc(doc(db, 'shiftSwapRequests', requestId));
      
      // Refresh requests
      await fetchMySwapRequests();
      
      // Show success message
      alert('Swap request cancelled successfully!');
    } catch (err) {
      console.error('Error cancelling swap request:', err);
      setError('Failed to cancel swap request');
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading indicator when appropriate
  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }
  
  // Show authentication message if not logged in
  if (!user) {
    return (
      <div className="text-center p-4 text-amber-600">
        Please log in to view your shift swap requests
      </div>
    );
  }
  
  // Show error if profile wasn't found
  if (profileLoaded && !currentUserProfile) {
    return (
      <div className="text-center p-4 text-red-600">
        Your user profile could not be found. Please contact an administrator.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Request Shift Swaps</h2>
      <p className="text-sm text-gray-600">
        Need someone to cover a shift? Create a swap request for your upcoming shifts.
      </p>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {/* My Upcoming Shifts Section */}
      <Card className="p-4">
        <h3 className="font-medium mb-4 flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          My Upcoming Shifts
        </h3>
        
        {upcomingShifts.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-500">You have no upcoming shifts scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingShifts.map(shift => {
              const hasRequest = hasExistingRequest(shift.id);
              
              return (
                <div key={shift.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{formatDate(shift.date)}</div>
                      <div className="text-blue-600">{shift.shift}</div>
                    </div>
                    
                    <div>
                      {hasRequest ? (
                        <div className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                          Swap Requested
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => handleOpenRequestDialog(shift)}
                          className="text-xs"
                        >
                          <AlarmClock className="h-3 w-3 mr-1" />
                          Request Swap
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      
      {/* My Swap Requests Section */}
      {mySwapRequests.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            My Swap Requests
          </h3>
          
          <div className="space-y-3">
            {mySwapRequests.map(request => (
              <div key={request.id} className={`border rounded-lg p-3 ${
                request.status === 'accepted' ? 'bg-green-50 border-green-200' :
                request.status === 'completed' ? 'bg-blue-50 border-blue-200' :
                request.status === 'cancelled' ? 'bg-gray-50 border-gray-200' : ''
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-medium">{formatDate(request.date)}</div>
                    <div className="text-blue-600">{request.shift}</div>
                  </div>
                  
                  <div className={`text-xs px-2 py-1 rounded ${
                    request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    request.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {request.status === 'pending' ? 'Pending' :
                     request.status === 'accepted' ? 'Accepted' :
                     request.status === 'completed' ? 'Completed' :
                     request.status === 'cancelled' ? 'Cancelled' : request.status}
                  </div>
                </div>
                
                {request.requestNote && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2">
                    <FileText className="h-3 w-3 inline mr-1" />
                    {request.requestNote}
                  </div>
                )}
                
                {request.status === 'accepted' && (
                  <div className="text-xs text-green-600">
                    <span className="font-medium">Accepted by:</span> {request.acceptorName}
                  </div>
                )}
                
                {request.status === 'pending' && (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelSwapRequest(request.id)}
                      className="text-xs text-red-600 hover:bg-red-50"
                    >
                      Cancel Request
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Create Swap Request Dialog */}
      <SimpleDialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        title="Request Shift Swap"
        description="Ask a team member to cover your shift"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitSwapRequest}>
              Submit Request
            </Button>
          </>
        }
      >
        {selectedShift && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500">Shift Details</div>
              <div className="font-medium">{formatDate(selectedShift.date)}</div>
              <div className="text-blue-600">{selectedShift.shift}</div>
            </div>
            
            <div>
              <label htmlFor="request-note" className="block text-sm font-medium text-gray-700 mb-1">
                Note (Optional)
              </label>
              <Textarea 
                id="request-note" 
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Add a note explaining why you need someone to cover this shift"
                className="resize-none h-20"
              />
            </div>
            
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
              <p>Your request will be visible to all team members. Once someone accepts it, the schedule will be updated automatically.</p>
            </div>
          </div>
        )}
      </SimpleDialog>
    </div>
  );
};

export default ShiftSwapRequest;