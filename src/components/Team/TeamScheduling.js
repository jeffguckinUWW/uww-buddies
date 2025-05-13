// src/components/Team/TeamScheduling.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Clock } from 'lucide-react';
import { getDateKey } from '../../utils/dateUtils';
import { useUserProfile } from '../../hooks/useUserProfile';
import LoadingSpinner from '../ui/LoadingSpinner';

// My Schedule Preview Component
const MySchedulePreview = ({ userId }) => {
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMySchedule = async () => {
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
        
        // Query shifts for this user in the next 14 days
        // Firebase doesn't support 'in' with more than 10 values
        const batch1 = nextTwoWeeks.slice(0, 10);
        const batch2 = nextTwoWeeks.slice(10);
        
        const shifts = [];
        
        // Fetch first batch
        const query1 = query(
          collection(db, 'schedules'),
          where('date', 'in', batch1),
          where('staffId', '==', userId)
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
            where('staffId', '==', userId)
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
        
        // Enhance shift data with day names and formatted dates
        const enhancedShifts = shifts.map(shift => {
          const [year, month, day] = shift.date.split('-').map(n => parseInt(n, 10));
          const shiftDate = new Date(year, month - 1, day);
          
          return {
            ...shift,
            dayName: shiftDate.toLocaleDateString('en-US', { weekday: 'short' }),
            formattedDate: shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          };
        });
        
        setUpcomingShifts(enhancedShifts);
      } catch (err) {
        console.error('Error fetching my schedule:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchMySchedule();
    }
  }, [userId]);
  
  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }
  
  if (upcomingShifts.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <p className="text-gray-500">You have no upcoming shifts scheduled</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {upcomingShifts.map(shift => (
        <div key={shift.id} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">{shift.dayName}, {shift.formattedDate}</span>
              <div className="text-blue-700">{shift.shift}</div>
            </div>
            {shift.notes && (
              <div className="text-sm text-gray-600 mt-1">{shift.notes}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Component to handle clock in/out functionality
const TimeClockComponent = ({ userId, currentUserProfile }) => {
  const [currentStatus, setCurrentStatus] = useState(null); // null, 'clock-in', or 'clock-out'
  const [loading, setLoading] = useState(true);
  const [lastAction, setLastAction] = useState(null);
  const [shifts, setShifts] = useState([]);
  
  // Get today's date key
  const todayKey = getDateKey(new Date());
  
  // Fetch time tracking data and today's shift
  useEffect(() => {
    const fetchTimeTrackingData = async () => {
      try {
        setLoading(true);
        
        // Query time tracking entries for today
        const timeTrackingQuery = query(
          collection(db, 'timeTracking'),
          where('date', '==', todayKey),
          where('staffId', '==', userId)
        );
        
        const timeTrackingSnapshot = await getDocs(timeTrackingQuery);
        const timeTrackingItems = timeTrackingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by timestamp (newest first)
        timeTrackingItems.sort((a, b) => {
          return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
        });
        
        // Set last action and current status
        if (timeTrackingItems.length > 0) {
          setLastAction(timeTrackingItems[0]);
          setCurrentStatus(timeTrackingItems[0].action);
        } else {
          setCurrentStatus('clock-out');
        }
        
        // Fetch today's shift
        const shiftQuery = query(
          collection(db, 'schedules'),
          where('date', '==', todayKey),
          where('staffId', '==', userId)
        );
        
        const shiftSnapshot = await getDocs(shiftQuery);
        const shiftItems = shiftSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setShifts(shiftItems);
      } catch (err) {
        console.error('Error fetching time tracking data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchTimeTrackingData();
    }
  }, [userId, todayKey]);
  
  // Handle clock in/out action
  const handleClockAction = async (action) => {
    try {
      setLoading(true);
      
      // Add new time tracking entry
      await addDoc(collection(db, 'timeTracking'), {
        staffId: userId,
        date: todayKey,
        action: action,
        timestamp: serverTimestamp()
      });
      
      // Update local state
      setCurrentStatus(action);
      
      // Fetch updated time tracking data
      const timeTrackingQuery = query(
        collection(db, 'timeTracking'),
        where('date', '==', todayKey),
        where('staffId', '==', userId)
      );
      
      const timeTrackingSnapshot = await getDocs(timeTrackingQuery);
      const timeTrackingItems = timeTrackingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by timestamp (newest first)
      timeTrackingItems.sort((a, b) => {
        return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
      });
      
      // Set last action
      if (timeTrackingItems.length > 0) {
        setLastAction(timeTrackingItems[0]);
      }
    } catch (err) {
      console.error('Error recording time:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const hasShiftToday = shifts.length > 0;
  
  if (loading) {
    return <LoadingSpinner message="Loading time clock data..." />;
  }
  
  return (
    <div className="mt-4">
  <Card className="p-4">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
      <div className="mb-3 md:mb-0">
        <div className="text-sm font-medium">Current Status:</div>
        <div className={`text-lg font-bold ${
          currentStatus === 'clock-in' ? 'text-green-600' : 'text-gray-600'
        }`}>
          {currentStatus === 'clock-in' ? 'Clocked In' : 'Clocked Out'}
        </div>
        
        {lastAction && lastAction.timestamp && (
          <div className="text-xs text-gray-500 mt-1">
            Last action: {new Date(lastAction.timestamp.seconds * 1000).toLocaleTimeString()}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
        {currentStatus !== 'clock-in' ? (
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white flex items-center w-full md:w-auto h-12 md:h-auto"
            onClick={() => handleClockAction('clock-in')}
          >
            <Clock className="h-4 w-4 mr-1" />
            Clock In
          </Button>
        ) : (
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white flex items-center w-full md:w-auto h-12 md:h-auto"
            onClick={() => handleClockAction('clock-out')}
          >
            <Clock className="h-4 w-4 mr-1" />
            Clock Out
          </Button>
        )}
      </div>
    </div>
        
        {hasShiftToday ? (
          <div className="bg-blue-50 mt-3 p-2 rounded text-sm">
            <div className="font-medium">Today's scheduled shift:</div>
            {shifts.map(shift => (
              <div key={shift.id} className="mt-1">
                {shift.shift} {shift.notes && `(${shift.notes})`}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-blue-50 mt-3 p-2 rounded text-sm">
            <div className="font-medium">No scheduled shift today</div>
            <p className="text-xs text-gray-600 mt-1">
              You can still clock in and out as needed for unscheduled work.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

const TeamScheduling = () => {
  const { user } = useAuth();
  const { userProfile: currentUserProfile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (currentUserProfile) {
      setLoading(false);
    }
  }, [currentUserProfile]);
  
  if (loading && !currentUserProfile) {
    return <LoadingSpinner message="Loading profile data..." />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">My Schedule & Time Clock</h2>
        <div className="text-xs text-gray-500">
          Logged in as: {currentUserProfile?.name || user?.email}
        </div>
      </div>
      
      {/* Personal schedule view */}
      <div>
        <h3 className="font-medium mb-3">My Upcoming Shifts</h3>
        <MySchedulePreview userId={user?.uid} />
      </div>
      
      {/* Time clock component */}
      <div>
        <h3 className="font-medium mb-3">My Time Clock</h3>
        <TimeClockComponent userId={user?.uid} currentUserProfile={currentUserProfile} />
      </div>
    </div>
  );
};

export default TeamScheduling;