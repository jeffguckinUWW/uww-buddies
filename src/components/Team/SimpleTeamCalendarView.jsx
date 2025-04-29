// src/components/Team/SimpleTeamCalendarView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';

// Color generator for different staff members
const getStaffColor = (staffId) => {
  // Simple hash function to generate a color based on staffId
  const hash = staffId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Generate HSL color with fixed saturation and lightness for better readability
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 80%)`;
};

const SimpleTeamCalendarView = ({ currentUserProfile }) => {
  const [shifts, setShifts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get days in the current month view - memoized with useCallback
  const getDaysInMonth = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Create date for first day of month
    const firstDay = new Date(year, month, 1);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate how many days to show from previous month
    // If first day is Sunday (0), we need to go back 6 days to start from Monday
    // If first day is Monday (1), we need to go back 0 days, etc.
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Start date will be X days before first day of month
    const startDate = new Date(year, month, 1 - daysFromPrevMonth);
    
    // Generate 42 days (6 weeks) starting from startDate
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  }, [currentMonth]);
  
  // Format date as string for Firebase queries
  const formatDateForQuery = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch schedules and profiles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get all days in the current month view
        const daysInMonth = getDaysInMonth();
        
        // Get first and last date in the view
        const firstDate = daysInMonth[0];
        const lastDate = daysInMonth[daysInMonth.length - 1];
        
        // Format dates for query
        const startDateStr = formatDateForQuery(firstDate);
        const endDateStr = formatDateForQuery(lastDate);

        // Fetch schedules for the current view
        const scheduleQuery = query(
          collection(db, 'schedules'),
          where('date', '>=', startDateStr),
          where('date', '<=', endDateStr),
          orderBy('date', 'asc')
        );
        
        const scheduleSnapshot = await getDocs(scheduleQuery);
        const scheduleList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch all staff profiles
        const profilesSnapshot = await getDocs(collection(db, 'profiles'));
        const profilesList = profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setProfiles(profilesList);
        setShifts(scheduleList);
      } catch (err) {
        console.error('Error loading schedule or profiles:', err);
        setError('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMonth, getDaysInMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date) => {
    const dateStr = formatDateForQuery(date);
    return shifts.filter(shift => shift.date === dateStr);
  };

  // Check if a date is in the current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Get staff name by ID
  const getStaffName = (staffId) => {
    const staff = profiles.find(p => p.id === staffId);
    return staff?.name || 'Unknown Staff';
  };

  if (loading) {
    return <LoadingSpinner message="Loading calendar data..." />;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Get all days to display
  const daysToDisplay = getDaysInMonth();

  return (
    <Card className="p-4">
      <div className="mb-4">
        {currentUserProfile && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg mb-4">
            <p><span className="font-medium">Your shifts</span> are highlighted with a blue border</p>
          </div>
        )}
      </div>
      
      {/* Calendar navigation */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-medium">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 text-center mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="font-medium py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {daysToDisplay.map((date, index) => {
          const shiftsForDate = getShiftsForDate(date);
          const isCurrentMonthDay = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          
          return (
            <div 
              key={index} 
              className={`min-h-24 border rounded-md p-1 ${
                !isCurrentMonthDay ? 'bg-gray-50 text-gray-400' : 
                isTodayDate ? 'border-blue-500' : 'bg-white'
              }`}
            >
              <div className="text-right text-sm font-medium mb-1">
                {date.getDate()}
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-20">
                {shiftsForDate.map(shift => {
                  const staffName = getStaffName(shift.staffId);
                  const backgroundColor = getStaffColor(shift.staffId);
                  const isCurrentUser = currentUserProfile && currentUserProfile.id === shift.staffId;
                  
                  return (
                    <div 
                      key={shift.id}
                      className={`text-xs p-1 rounded truncate ${
                        isCurrentUser ? 'border-2 border-blue-500' : ''
                      }`}
                      style={{ backgroundColor }}
                    >
                      <div className="font-medium">{staffName}</div>
                      {shift.shift && <div>{shift.shift}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default SimpleTeamCalendarView;