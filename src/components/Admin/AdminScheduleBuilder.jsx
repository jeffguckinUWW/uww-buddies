import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Calendar, 
  Clock, 
  Download, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash, 
  ChevronLeft, 
  ChevronRight,
  Users,
  BarChart,
  AlertCircle
} from 'lucide-react';
import { getDateKey, formatDate, } from '../../utils/dateUtils';
import SimpleDialog from '../ui/SimpleDialog';
import ErrorDisplay from '../ui/ErrorDisplay';
import { checkForScheduleConflicts } from '../../utils/scheduleConflictUtils';
import LoadingSpinner from '../ui/LoadingSpinner';

const AdminScheduleBuilder = () => {
  // States for data
  const [staffMembers, setStaffMembers] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States for UI
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');

  // State for time-off data
  const [timeOffData, setTimeOffData] = useState({});
  
  // States for shift management
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [shiftDialogMode, setShiftDialogMode] = useState('create'); // 'create' or 'edit'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedShift, setSelectedShift] = useState({
    staffId: '',
    startTime: '',
    endTime: '',
    notes: ''
  });
  const [existingShiftId, setExistingShiftId] = useState(null);
  
  // States for time card report
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [timeCardData, setTimeCardData] = useState([]);
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 14)),
    end: new Date()
  });
  
  // States for schedule statistics
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [statsDateRange, setStatsDateRange] = useState({
    start: new Date(new Date().setDate(1)), // First day of current month
    end: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)) // Last day of current month
  });
  
  // States for bulk schedule management
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkScheduleData, setBulkScheduleData] = useState({
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday through Saturday
    staffIds: []
  });
  
  // Fetch staff members
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        const staffQuery = query(
          collection(db, 'profiles'),
          where('teamAccess.hasAccess', '==', true)
        );
        const staffSnapshot = await getDocs(staffQuery);
        const staffList = staffSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStaffMembers(staffList);
      } catch (err) {
        console.error('Error fetching staff members:', err);
        setError('Failed to load staff members');
      }
    };
    
    fetchStaffMembers();
  }, []);
  
  // Calculate days to display based on view mode and current date
  const getDaysToDisplay = useCallback(() => {
    const days = [];
    const startDate = new Date(currentDate);
    
    if (viewMode === 'day') {
      days.push(new Date(startDate));
    } 
    else if (viewMode === 'week') {
      // Get current day (0 = Sunday, 1 = Monday, etc.)
      const currentDay = currentDate.getDay();
      
      // Calculate offset to get to Monday (if Sunday, go back 6 days, otherwise go back currentDay-1)
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
      
      // Set to beginning of week (Monday)
      startDate.setDate(currentDate.getDate() - daysToSubtract);
      
      // Add 7 days
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
    }
    else if (viewMode === 'month') {
      // Set to first day of month
      startDate.setDate(1);
      
      // Get first day of the month (0 = Sunday, 1 = Monday, etc.)
      const firstDay = new Date(startDate).getDay();
      
      // Calculate days to subtract to get to the Monday before the 1st
      // If firstDay is 0 (Sunday), go back 6 days; if 1 (Monday), go back 0, etc.
      const daysToSubtract = firstDay === 0 ? 6 : firstDay - 1;
      
      // Go back to the first Monday of the calendar view
      startDate.setDate(startDate.getDate() - daysToSubtract);
      
      // Generate 6 weeks of dates (42 days)
      for (let i = 0; i < 42; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
    }
    
    return days;
  }, [currentDate, viewMode]);
  
  // Get default shift times based on day of week
  const getDefaultShiftTimes = (date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (day === 0) { // Sunday
      return { startTime: '', endTime: '' }; // Closed by default
    } else if (day === 6) { // Saturday
      return { startTime: '10:00', endTime: '18:00' }; // 10am - 6pm
    } else { // Monday - Friday
      return { startTime: '11:00', endTime: '19:00' }; // 11am - 7pm
    }
  };
  
  // Format a time string with AM/PM
  const formatTimeWithAMPM = (timeStr) => {
    if (!timeStr) return '';
    
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    const period = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''}${period}`;
  };
  
  // Get shifts for a specific date
  const getShiftsForDate = (date) => {
    const dateKey = getDateKey(date);
    return scheduleData[dateKey] || [];
  };

  // Fetch time-off data for the displayed dates
  const fetchTimeOffData = useCallback(async (dateKeys) => {
    try {
      // Query for approved time-off requests
      const timeOffQuery = query(
        collection(db, 'timeOffRequests'),
        where('status', '==', 'approved')
      );
      
      const timeOffSnapshot = await getDocs(timeOffQuery);
      const timeOffRequests = timeOffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Process time-off data by date
      const timeOffByDate = {};
      
      // For each date in our view, check if any staff members have time off
      for (const dateKey of dateKeys) {
        timeOffByDate[dateKey] = [];
        const currentDate = new Date(dateKey);
        
        // Check each approved time-off request
        for (const request of timeOffRequests) {
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);
          
          // Normalize dates to compare just the date part
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          currentDate.setHours(12, 0, 0, 0);
          
          // If current date falls within the time-off period
          if (currentDate >= startDate && currentDate <= endDate) {
            const staffMember = staffMembers.find(s => s.id === request.staffId);
            
            timeOffByDate[dateKey].push({
              staffId: request.staffId,
              name: staffMember ? staffMember.name : request.staffName || 'Unknown',
              reason: request.reason,
              requestId: request.id
            });
          }
        }
      }
      
      setTimeOffData(timeOffByDate);
    } catch (err) {
      console.error('Error fetching time-off data:', err);
    }
  }, [staffMembers]);
  
  // Fetch schedule data for displayed dates
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        
        const daysToDisplay = getDaysToDisplay();
        const dateKeys = daysToDisplay.map(date => getDateKey(date));
        
        // Firebase doesn't support 'in' operator with more than 10 values,
        // so we need to split the query if we have more than 10 dates
        const batchSize = 10;
        let allScheduleData = {};
        
        for (let i = 0; i < dateKeys.length; i += batchSize) {
          const batchDateKeys = dateKeys.slice(i, i + batchSize);
          
          const scheduleQuery = query(
            collection(db, 'schedules'),
            where('date', 'in', batchDateKeys)
          );
          
          const scheduleSnapshot = await getDocs(scheduleQuery);
          const scheduleItems = scheduleSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Group by date
          scheduleItems.forEach(item => {
            if (!allScheduleData[item.date]) {
              allScheduleData[item.date] = [];
            }
            allScheduleData[item.date].push(item);
          });
        }
        
        setScheduleData(allScheduleData);
        
        // Also fetch time-off data for these dates
        await fetchTimeOffData(dateKeys);
      } catch (err) {
        console.error('Error fetching schedule data:', err);
        setError('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchScheduleData();
  }, [currentDate, viewMode, getDaysToDisplay, fetchTimeOffData]);
  
  // Navigate to previous period
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };
  
  // Navigate to next period
  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };
  
  // Handle opening shift dialog for a date
  const handleOpenShiftDialog = (date, staffId = null, existingShift = null) => {
    setSelectedDate(date);
    
    if (existingShift) {
      // Edit existing shift
      setShiftDialogMode('edit');
      setExistingShiftId(existingShift.id);
      
      // Parse existing shift data
      const [startTime, endTime] = existingShift.shift.split(' - ');
      
      // Convert times from AM/PM format to 24-hour format
      const convertTimeToInput = (timeStr) => {
        const isPM = timeStr.toLowerCase().includes('pm');
        const is12 = timeStr.toLowerCase().startsWith('12');
        let [hours, minutes] = timeStr.replace(' AM', '').replace(' PM', '').replace('am', '').replace('pm', '').split(':');
        
        hours = parseInt(hours, 10);
        if (isPM && !is12) hours += 12;
        if (!isPM && is12) hours = 0;
        
        minutes = minutes || '00';
        
        return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      };
      
      setSelectedShift({
        staffId: existingShift.staffId,
        startTime: convertTimeToInput(startTime),
        endTime: convertTimeToInput(endTime),
        notes: existingShift.notes || ''
      });
    } else {
      // Create new shift
      setShiftDialogMode('create');
      setExistingShiftId(null);
      
      // Get default shift times based on day of week
      const defaultTimes = getDefaultShiftTimes(date);
      
      setSelectedShift({
        staffId: staffId || '',
        startTime: defaultTimes.startTime,
        endTime: defaultTimes.endTime,
        notes: ''
      });
    }
    
    setShowShiftDialog(true);
  };
  
  // Save or update a shift
  const saveShift = async () => {
    if (!selectedDate || !selectedShift.staffId || !selectedShift.startTime || !selectedShift.endTime) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Check for schedule conflicts
    const conflicts = await checkForScheduleConflicts(
      selectedShift.staffId, 
      selectedDate, 
      selectedShift.startTime, 
      selectedShift.endTime,
      shiftDialogMode === 'edit' ? existingShiftId : null,
      scheduleData
    );
    
    if (conflicts.length > 0) {
      // Show conflicts to admin
      const timeOffConflicts = conflicts.filter(c => c.type === 'timeOff');
      const shiftConflicts = conflicts.filter(c => c.type === 'overlap');
      
      let confirmMessage = 'The following conflicts were detected:\n\n';
      
      if (timeOffConflicts.length > 0) {
        confirmMessage += 'TIME-OFF CONFLICTS:\n';
        confirmMessage += timeOffConflicts.map(conflict => 
          `- ${conflict.message}`
        ).join('\n');
        confirmMessage += '\n\n';
      }
      
      if (shiftConflicts.length > 0) {
        confirmMessage += 'SHIFT CONFLICTS:\n';
        confirmMessage += shiftConflicts.map(conflict => 
          `- ${conflict.message}`
        ).join('\n');
      }
      
      confirmMessage += '\n\nDo you want to save this shift anyway?';
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    try {
      const dateKey = getDateKey(selectedDate);
      const formattedShift = `${formatTimeWithAMPM(selectedShift.startTime)} - ${formatTimeWithAMPM(selectedShift.endTime)}`;
      
      if (shiftDialogMode === 'edit' && existingShiftId) {
        // Update existing shift
        const shiftRef = doc(db, 'schedules', existingShiftId);
        await updateDoc(shiftRef, {
          staffId: selectedShift.staffId,
          shift: formattedShift,
          notes: selectedShift.notes,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new shift
        await addDoc(collection(db, 'schedules'), {
          staffId: selectedShift.staffId,
          date: dateKey,
          shift: formattedShift,
          notes: selectedShift.notes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Refresh schedule data
      const updatedScheduleData = { ...scheduleData };
      
      // Fetch the updated schedule for this date
      const scheduleQuery = query(
        collection(db, 'schedules'),
        where('date', '==', dateKey)
      );
      
      const scheduleSnapshot = await getDocs(scheduleQuery);
      updatedScheduleData[dateKey] = scheduleSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setScheduleData(updatedScheduleData);
      setShowShiftDialog(false);
    } catch (err) {
      console.error('Error saving shift:', err);
      setError('Failed to save shift');
    }
  };
  
  // Delete a shift
  const deleteShift = async () => {
    if (!existingShiftId) return;
    
    if (!window.confirm("Are you sure you want to delete this shift?")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'schedules', existingShiftId));
      
      // Update local state
      const dateKey = getDateKey(selectedDate);
      const updatedScheduleData = { ...scheduleData };
      
      if (updatedScheduleData[dateKey]) {
        updatedScheduleData[dateKey] = updatedScheduleData[dateKey].filter(
          item => item.id !== existingShiftId
        );
      }
      
      setScheduleData(updatedScheduleData);
      setShowShiftDialog(false);
    } catch (err) {
      console.error('Error deleting shift:', err);
      setError('Failed to delete shift');
    }
  };
  
  // Render day cell for calendar
  const renderDayCell = (date) => {
    const dateKey = getDateKey(date);
    const shifts = scheduleData[dateKey] || [];
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isToday = getDateKey(date) === getDateKey(new Date());
    
    // Check if the day is Sunday
    const isSunday = date.getDay() === 0;
    
    // Get staff on time-off for this date
    const staffOnTimeOff = timeOffData[dateKey] || [];
    
    return (
      <div 
        className={`border min-h-[100px] ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} ${isToday ? 'border-blue-400' : 'border-gray-200'} ${isSunday ? 'bg-gray-100' : ''}`}
      >
        <div className="flex justify-between items-center p-1 border-b">
          <span className={`text-sm font-medium ${isCurrentMonth ? '' : 'text-gray-400'} ${isToday ? 'text-blue-600' : ''}`}>
            {date.getDate()}
          </span>
          
          {/* Only show add button for dates in the current month */}
          {isCurrentMonth && (
            <button 
              onClick={() => handleOpenShiftDialog(date)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        
        <div className="p-1 space-y-1">
          {/* Time-off indicators */}
          {staffOnTimeOff.length > 0 && (
            <div className="p-1 text-xs text-red-600 bg-red-50 rounded mb-1">
              <div className="font-medium">Time Off:</div>
              {staffOnTimeOff.map(staff => (
                <div key={staff.staffId} className="truncate">
                  {staff.name} ({staff.reason})
                </div>
              ))}
            </div>
          )}
          
          {/* Shifts */}
          {shifts.map((shift) => {
            const staff = staffMembers.find(member => member.id === shift.staffId);
            // Check if this staff member has time off on this date
            const hasTimeOff = staffOnTimeOff.some(to => to.staffId === shift.staffId);
            
            return (
              <div 
                key={shift.id}
                className={`${hasTimeOff ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} p-1 rounded text-xs cursor-pointer hover:bg-blue-200`}
                onClick={() => handleOpenShiftDialog(date, null, shift)}
              >
                <div className="font-medium">{shift.shift}</div>
                <div className="flex items-center">
                  {staff?.name || 'Unknown'}
                  {hasTimeOff && (
                    <span className="ml-1 text-red-600 text-xs">⚠️</span>
                  )}
                </div>
                {shift.notes && (
                  <div className="text-blue-600 text-xs truncate">{shift.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Mobile-optimized day cell for the calendar
  const renderMobileDayCell = (date) => {
    const dateKey = getDateKey(date);
    const shifts = scheduleData[dateKey] || [];
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isToday = getDateKey(date) === getDateKey(new Date());
    const isSunday = date.getDay() === 0;
    
    // Get staff on time-off for this date
    const staffOnTimeOff = timeOffData[dateKey] || [];
    
    return (
      <div 
        className={`${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} 
                    ${isToday ? 'border-blue-400 border-2' : 'border border-gray-200'} 
                    ${isSunday ? 'bg-gray-100' : ''} 
                    rounded-lg overflow-hidden mb-3 shadow-sm`}
      >
        <div className="flex justify-between items-center p-3 bg-gray-50">
          <span className={`font-medium ${isCurrentMonth ? '' : 'text-gray-400'} ${isToday ? 'text-blue-600' : ''}`}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}, {date.getDate()}
          </span>
          
          {isCurrentMonth && (
            <button 
              onClick={() => handleOpenShiftDialog(date)}
              className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 rounded-full"
              aria-label="Add shift"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
        
        <div className="p-2 space-y-2 max-h-36 overflow-y-auto">
          {/* Time-off indicators */}
          {staffOnTimeOff.length > 0 && (
            <div className="p-2 text-xs text-red-600 bg-red-50 rounded mb-1">
              <div className="font-medium flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Time Off:
              </div>
              {staffOnTimeOff.map(staff => (
                <div key={staff.staffId} className="truncate pl-1 pt-1">
                  {staff.name}
                </div>
              ))}
            </div>
          )}
          
          {shifts.map((shift) => {
            const staff = staffMembers.find(member => member.id === shift.staffId);
            const hasTimeOff = staffOnTimeOff.some(to => to.staffId === shift.staffId);
            
            return (
              <div 
                key={shift.id}
                className={`${hasTimeOff ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} 
                            p-3 rounded text-sm cursor-pointer active:opacity-80 
                            flex justify-between items-start shadow-sm`}
                onClick={() => handleOpenShiftDialog(date, null, shift)}
              >
                <div>
                  <div className="font-medium">{shift.shift}</div>
                  <div className="flex items-center">
                    {staff?.name || 'Unknown'}
                    {hasTimeOff && (
                      <span className="ml-1 text-red-600 text-xs">⚠️</span>
                    )}
                  </div>
                </div>
                {shift.notes && (
                  <div className="text-xs italic truncate max-w-[100px]">{shift.notes}</div>
                )}
              </div>
            );
          })}
          
          {shifts.length === 0 && isCurrentMonth && (
            <div className="text-xs text-gray-500 text-center py-4">
              No shifts scheduled
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Mobile week view 
  const renderMobileWeekView = () => {
    const daysToDisplay = getDaysToDisplay();
    
    return (
      <div className="space-y-2 md:hidden">
        {daysToDisplay.map((date, index) => (
          <div key={index}>
            {renderMobileDayCell(date)}
          </div>
        ))}
      </div>
    );
  };
  
  // Mobile month view
  const renderMobileMonthView = () => {
    const daysToDisplay = getDaysToDisplay();
    
    // Group days by week
    const weeks = [];
    for (let i = 0; i < daysToDisplay.length; i += 7) {
      weeks.push(daysToDisplay.slice(i, i + 7));
    }
    
    return (
      <div className="space-y-4 md:hidden">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">
              Week of {week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h3>
            {week.map((date, dateIndex) => (
              <div key={dateIndex}>
                {renderMobileDayCell(date)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  // Mobile day view
  const renderMobileDayView = () => {
    const dateKey = getDateKey(currentDate);
    const staffOnTimeOff = timeOffData[dateKey] || [];
    
    return (
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">
            {formatDate(currentDate)}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenShiftDialog(currentDate)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        
        
        {/* Time-off indicators */}
        {staffOnTimeOff.length > 0 && (
          <div className="p-2 text-sm text-red-600 bg-red-50 rounded mb-4">
            <div className="font-medium">Staff on Time Off:</div>
            {staffOnTimeOff.map(staff => (
              <div key={staff.staffId} className="flex items-center">
                <span>• {staff.name}</span>
                <span className="ml-2 text-xs bg-red-100 px-2 py-0.5 rounded">
                  {staff.reason}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <div className="space-y-2">
          {getShiftsForDate(currentDate).length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No shifts scheduled</p>
            </div>
          ) : (
            getShiftsForDate(currentDate).map(shift => {
              const staff = staffMembers.find(member => member.id === shift.staffId);
              // Check if this staff member has time off on this date
              const hasTimeOff = staffOnTimeOff.some(to => to.staffId === shift.staffId);
              
              return (
                <div
                  key={shift.id}
                  className={`flex justify-between items-center p-3 border rounded-lg hover:bg-blue-50 cursor-pointer ${
                    hasTimeOff ? 'bg-red-50 border-red-200' : ''
                  }`}
                  onClick={() => handleOpenShiftDialog(currentDate, null, shift)}
                >
                  <div>
                    <div className="font-medium">
                      {staff?.name || 'Unknown'}
                      {hasTimeOff && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Time Off
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-blue-600">{shift.shift}</div>
                    {shift.notes && (
                      <div className="text-xs text-gray-500 mt-1">{shift.notes}</div>
                    )}
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-100 p-1 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShiftDialog(currentDate, null, shift);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-100 p-1 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(currentDate);
                        setExistingShiftId(shift.id);
                        deleteShift();
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };
  
  // Schedule Statistics Component
  const ScheduleStatistics = ({ scheduleData, staffMembers, startDate, endDate }) => {
    const [stats, setStats] = useState({
      totalShifts: 0,
      hoursPerStaff: [],
      shiftsPerDay: [],
      coverage: []
    });
    
    // Wrap calculateStatistics in useCallback to properly memoize it
    const calculateStatistics = useCallback(() => {
      // Get all dates between start and end date
      const dateRange = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dateRange.push(getDateKey(date));
      }
      
      // Initialize statistics
      let totalShifts = 0;
      const staffHours = {};
      const shiftsPerDay = {};
      const dailyCoverage = {};
      
      // Initialize staff hours
      staffMembers.forEach(staff => {
        staffHours[staff.id] = 0;
      });
      
      // Initialize days
      dateRange.forEach(dateKey => {
        shiftsPerDay[dateKey] = 0;
        dailyCoverage[dateKey] = [];
      });
      
      // Process each date in the range
      dateRange.forEach(dateKey => {
        const shifts = scheduleData[dateKey] || [];
        totalShifts += shifts.length;
        shiftsPerDay[dateKey] = shifts.length;
        
        // Process individual shifts
        shifts.forEach(shift => {
          // Calculate hours for this shift
          const [startStr, endStr] = shift.shift.split(' - ');
          
          // Convert AM/PM times to 24-hour format for calculation
          const convertAMPMToMinutes = (timeStr) => {
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
            
            return hours * 60 + minutes;
          };
          
          const startMinutes = convertAMPMToMinutes(startStr);
          const endMinutes = convertAMPMToMinutes(endStr);
          
          // Calculate shift duration in hours
          const shiftHours = (endMinutes - startMinutes) / 60;
          
          // Add to staff hours
          if (staffHours[shift.staffId] !== undefined) {
            staffHours[shift.staffId] += shiftHours;
          }
          
          // Add to daily coverage
          if (dailyCoverage[dateKey]) {
            // Track each half-hour slot covered
            for (let minute = startMinutes; minute < endMinutes; minute += 30) {
              const timeSlot = Math.floor(minute / 30) * 30;
              if (!dailyCoverage[dateKey].includes(timeSlot)) {
                dailyCoverage[dateKey].push(timeSlot);
              }
            }
          }
        });
      });
      
      // Convert to arrays for easier rendering
      const hoursPerStaff = Object.keys(staffHours).map(staffId => {
        const staff = staffMembers.find(s => s.id === staffId);
        return {
          staffId,
          name: staff?.name || 'Unknown',
          hours: parseFloat(staffHours[staffId].toFixed(2))
        };
      }).sort((a, b) => b.hours - a.hours); // Sort by hours desc
      
      const shiftsPerDayArray = Object.keys(shiftsPerDay).map(date => {
        const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
        const dateObj = new Date(year, month - 1, day);
        
        return {
          date,
          dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
          formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          shifts: shiftsPerDay[date]
        };
      });
      
      // Calculate coverage percentage for each day
      // Assuming business hours are 9am-9pm (12 hours = 24 half-hour slots)
      const businessHoursSlots = 24; // Number of half-hour slots in business hours
      
      const coverageArray = Object.keys(dailyCoverage).map(date => {
        const [year, month, day] = date.split('-').map(n => parseInt(n, 10));
        const dateObj = new Date(year, month - 1, day);
        const isClosed = dateObj.getDay() === 0; // Sunday is closed
        
        // For closed days, coverage is 100% (since no coverage is needed)
        const coverage = isClosed ? 100 : (dailyCoverage[date].length / businessHoursSlots) * 100;
        
        return {
          date,
          dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
          formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          coverage: parseFloat(coverage.toFixed(2)),
          isClosed
        };
      });
      
      setStats({
        totalShifts,
        hoursPerStaff,
        shiftsPerDay: shiftsPerDayArray,
        coverage: coverageArray
      });
    }, [scheduleData, startDate, endDate, staffMembers]); // Add all dependencies here
    
    // Update useEffect to use the memoized callback
    useEffect(() => {
      calculateStatistics();
    }, [calculateStatistics]);
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Total Shifts</h3>
            <p className="text-2xl font-bold text-blue-700">{stats.totalShifts}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Date Range</h3>
            <p className="text-lg font-bold text-green-700">
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Avg. Hours per Staff</h3>
            <p className="text-2xl font-bold text-purple-700">
              {stats.hoursPerStaff.length > 0 
                ? (stats.hoursPerStaff.reduce((sum, s) => sum + s.hours, 0) / stats.hoursPerStaff.filter(s => s.hours > 0).length).toFixed(1)
                : 0}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3">Hours by Staff Member</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b grid grid-cols-2">
                <div className="font-medium">Staff</div>
                <div className="font-medium text-right">Hours</div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {stats.hoursPerStaff.map(staff => (
                  <div key={staff.staffId} className="p-3 border-b grid grid-cols-2 hover:bg-gray-50">
                    <div>{staff.name}</div>
                    <div className="text-right font-mono">{staff.hours}</div>
                  </div>
                ))}
                
                {stats.hoursPerStaff.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No staff hours to display
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Coverage by Day</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b grid grid-cols-2">
                <div className="font-medium">Date</div>
                <div className="font-medium text-right">Coverage</div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {stats.coverage.map(day => (
                  <div key={day.date} className="p-3 border-b grid grid-cols-2 hover:bg-gray-50">
                    <div>{day.dayName}, {day.formattedDate}</div>
                    <div className="text-right">
                      {day.isClosed ? (
                        <span className="text-gray-500">Closed</span>
                      ) : (
                        <div className="flex items-center justify-end">
                          <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div 
                              className={`h-2.5 rounded-full ${
                                day.coverage < 60 ? 'bg-red-500' : 
                                day.coverage < 80 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${day.coverage}%` }}
                            ></div>
                          </div>
                          <span className="font-mono">{day.coverage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {stats.coverage.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No coverage data to display
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Generate time card report
  const generateTimeCardReport = async () => {
    try {
      setLoading(true);
      
      // Format date range for query
      const startKey = getDateKey(reportDateRange.start);
      const endKey = getDateKey(reportDateRange.end);
      
      // Query all time tracking entries within the date range
      const timeTrackingQuery = query(
        collection(db, 'timeTracking'),
        where('date', '>=', startKey),
        where('date', '<=', endKey),
        orderBy('date')
      );
      
      const timeTrackingSnapshot = await getDocs(timeTrackingQuery);
      const timeTrackingItems = timeTrackingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Process time tracking data by staff member
      const staffTimeData = {};
      
      timeTrackingItems.forEach(item => {
        if (!staffTimeData[item.staffId]) {
          staffTimeData[item.staffId] = [];
        }
        
        staffTimeData[item.staffId].push(item);
      });
      
      // Calculate hours worked for each staff member
      const reportResults = [];
      
      for (const staffId in staffTimeData) {
        const staffMember = staffMembers.find(member => member.id === staffId);
        if (!staffMember) continue;
        
        // Group time entries by date
        const entriesByDate = {};
        
        staffTimeData[staffId].forEach(entry => {
          if (!entriesByDate[entry.date]) {
            entriesByDate[entry.date] = [];
          }
          
          entriesByDate[entry.date].push({
            action: entry.action,
            timestamp: entry.timestamp
          });
        });
        
        // Calculate hours for each day
        const dailyHours = [];
        
        for (const date in entriesByDate) {
          // Sort entries by timestamp
          const sortedEntries = entriesByDate[date].sort((a, b) => {
            return (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0);
          });
          
          // Find clock-in/clock-out pairs
          let totalMinutes = 0;
          let lastClockIn = null;
          
          sortedEntries.forEach(entry => {
            if (entry.action === 'clock-in') {
              lastClockIn = entry.timestamp;
            } else if (entry.action === 'clock-out' && lastClockIn) {
              // Calculate minutes between clock-in and clock-out
              const clockInTime = lastClockIn.seconds * 1000;
              const clockOutTime = entry.timestamp.seconds * 1000;
              const diffMinutes = Math.round((clockOutTime - clockInTime) / (1000 * 60));
              
              totalMinutes += diffMinutes;
              lastClockIn = null;
            }
          });
          
          // Convert minutes to hours and minutes
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          
          // Check if the person is still clocked in
          const isStillClockedIn = lastClockIn !== null;
          
          dailyHours.push({
            date,
            displayDate: new Date(date.split('-')[0], date.split('-')[1] - 1, date.split('-')[2]).toLocaleDateString(),
            totalTime: `${hours}h ${minutes}m`,
            totalMinutes,
            isStillClockedIn
          });
        }
        
        // Sort daily hours by date
        dailyHours.sort((a, b) => a.date.localeCompare(b.date));
        
        // Calculate total hours for the period
        const totalMinutes = dailyHours.reduce((sum, day) => sum + day.totalMinutes, 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        
        reportResults.push({
          staffId,
          staffName: staffMember.name || 'Unknown Staff',
          totalHours: `${totalHours}h ${remainingMinutes}m`,
          totalMinutes,
          dailyBreakdown: dailyHours
        });
      }
      
      // Sort by staff name
      reportResults.sort((a, b) => a.staffName.localeCompare(b.staffName));
      
      setTimeCardData(reportResults);
      setShowReportDialog(true);
    } catch (err) {
      console.error('Error generating time card report:', err);
      setError('Failed to generate time card report');
    } finally {
      setLoading(false);
    }
  };
  
  // Export time card data to CSV
  const exportTimeCardCSV = () => {
    if (timeCardData.length === 0) return;
    
    // Create CSV header
    let csvContent = "Staff Member,Total Hours,Daily Breakdown\n";
    
    // Add data rows
    timeCardData.forEach(staff => {
      let dailyBreakdownText = staff.dailyBreakdown
        .map(day => `${day.displayDate}: ${day.totalTime}${day.isStillClockedIn ? ' (Still clocked in)' : ''}`)
        .join('; ');
      
      csvContent += `"${staff.staffName}","${staff.totalHours}","${dailyBreakdownText}"\n`;
    });
    
    // Create detailed CSV with day-by-day breakdown
    let detailedCsvContent = "Staff Member,Date,Hours Worked,Status\n";
    
    timeCardData.forEach(staff => {
      staff.dailyBreakdown.forEach(day => {
        detailedCsvContent += `"${staff.staffName}","${day.displayDate}","${day.totalTime}","${day.isStillClockedIn ? 'Still clocked in' : 'Completed'}"\n`;
      });
    });
    
    // Create and trigger download for summary CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `time-card-summary-${getDateKey(reportDateRange.start)}-to-${getDateKey(reportDateRange.end)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Create and trigger download for detailed CSV
    const detailedBlob = new Blob([detailedCsvContent], { type: 'text/csv;charset=utf-8;' });
    const detailedUrl = URL.createObjectURL(detailedBlob);
    const detailedLink = document.createElement('a');
    
    detailedLink.setAttribute('href', detailedUrl);
    detailedLink.setAttribute('download', `time-card-detailed-${getDateKey(reportDateRange.start)}-to-${getDateKey(reportDateRange.end)}.csv`);
    detailedLink.style.visibility = 'hidden';
    
    document.body.appendChild(detailedLink);
    detailedLink.click();
    document.body.removeChild(detailedLink);
  };
  
  // Toggle a day of week selection in bulk scheduling
  const toggleDayOfWeek = (day) => {
    const currentDays = [...bulkScheduleData.daysOfWeek];
    const index = currentDays.indexOf(day);
    
    if (index >= 0) {
      currentDays.splice(index, 1);
    } else {
      currentDays.push(day);
    }
    
    setBulkScheduleData({
      ...bulkScheduleData,
      daysOfWeek: currentDays
    });
  };
  
  // Toggle a staff member selection in bulk scheduling
  const toggleStaffSelection = (staffId) => {
    const currentStaff = [...bulkScheduleData.staffIds];
    const index = currentStaff.indexOf(staffId);
    
    if (index >= 0) {
      currentStaff.splice(index, 1);
    } else {
      currentStaff.push(staffId);
    }
    
    setBulkScheduleData({
      ...bulkScheduleData,
      staffIds: currentStaff
    });
  };
  
  // Handle opening bulk dialog
  const handleOpenBulkDialog = () => {
    // Reset bulk schedule data with default times
    setBulkScheduleData({
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday through Saturday
      staffIds: []
    });
    
    setShowBulkDialog(true);
  };
  
  // Create bulk schedule
  const createBulkSchedule = async () => {
    if (bulkScheduleData.staffIds.length === 0) {
      alert("Please select at least one staff member");
      return;
    }
    
    if (bulkScheduleData.daysOfWeek.length === 0) {
      alert("Please select at least one day of the week");
      return;
    }
    
    if (!window.confirm("This will create schedules for the selected staff members on the specified days. Continue?")) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Generate dates based on start/end and selected days of week
      const dates = [];
      const currentDate = new Date(bulkScheduleData.startDate);
      const endDate = new Date(bulkScheduleData.endDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        if (bulkScheduleData.daysOfWeek.includes(dayOfWeek)) {
          dates.push(new Date(currentDate));
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Create schedule entries for each staff member and date
      const batch = [];
      const conflictsFound = [];
      
      for (const staffId of bulkScheduleData.staffIds) {
        for (const date of dates) {
          const dateKey = getDateKey(date);
          const dayOfWeek = date.getDay();
          
          // Check for time-off conflicts
          const dateTimeOffData = timeOffData[dateKey] || [];
          const staffHasTimeOff = dateTimeOffData.some(to => to.staffId === staffId);
          
          if (staffHasTimeOff) {
            const staffName = staffMembers.find(s => s.id === staffId)?.name || 'Unknown';
            const reason = dateTimeOffData.find(to => to.staffId === staffId)?.reason || 'Unknown reason';
            
            conflictsFound.push({
              staffId,
              staffName,
              date: formatDate(date),
              reason
            });
            
            // Skip creating schedule for this date/staff
            continue;
          }
          
          // Get shift times based on day of week
          let shiftTimes;
          if (dayOfWeek === 6) { // Saturday
            shiftTimes = { startTime: '10:00', endTime: '18:00' };
          } else { // Monday-Friday
            shiftTimes = { startTime: '11:00', endTime: '19:00' };
          }
          
          // Format the shift time
          const formattedShift = `${formatTimeWithAMPM(shiftTimes.startTime)} - ${formatTimeWithAMPM(shiftTimes.endTime)}`;
          
          // Check if a schedule already exists for this staff and date
          const existingSchedule = scheduleData[dateKey]?.find(
            item => item.staffId === staffId
          );
          
          if (existingSchedule) {
            // Update existing schedule
            const scheduleRef = doc(db, 'schedules', existingSchedule.id);
            batch.push(updateDoc(scheduleRef, {
              shift: formattedShift,
              updatedAt: serverTimestamp()
            }));
          } else {
            // Create new schedule
            batch.push(addDoc(collection(db, 'schedules'), {
              staffId,
              date: dateKey,
              shift: formattedShift,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }));
          }
        }
      }
      
      // Show conflicts if any were found
      if (conflictsFound.length > 0) {
        const confirmMessage = `The following staff have approved time-off during the selected period:\n\n${
          conflictsFound.map(c => `- ${c.staffName} on ${c.date}: ${c.reason}`).join('\n')
        }\n\nShifts for these dates will be skipped. Continue with creating the other shifts?`;
        
        if (!window.confirm(confirmMessage)) {
          setLoading(false);
          return;
        }
      }
      
      // Execute all operations
      await Promise.all(batch);
      
      // Refresh schedule data
      const updatedScheduleData = { ...scheduleData };
      
      for (const date of dates) {
        const dateKey = getDateKey(date);
        
        // Fetch the updated schedule for this date
        const scheduleQuery = query(
          collection(db, 'schedules'),
          where('date', '==', dateKey)
        );
        
        const scheduleSnapshot = await getDocs(scheduleQuery);
        updatedScheduleData[dateKey] = scheduleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      setScheduleData(updatedScheduleData);
      setShowBulkDialog(false);
      
      alert(`Successfully created ${batch.length} schedule entries.`);
    } catch (err) {
      console.error('Error creating bulk schedules:', err);
      setError('Failed to create bulk schedules');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  return (
    <div className="space-y-4">
      {/* Admin Header - UPDATED */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Team Schedule
          </h1>
          <div className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full mt-2 md:mt-0">
            Admin Mode
          </div>
        </div>
        
        {/* UPDATED: Better responsive layout for buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button 
            size="sm" 
            onClick={generateTimeCardReport}
            className="flex items-center justify-center"
          >
            <Clock className="h-4 w-4 mr-1" />
            Time Cards
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenBulkDialog}
            className="flex items-center justify-center"
          >
            <Calendar className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Create Bulk Schedule</span>
            <span className="sm:hidden">Bulk Create</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowStatsDialog(true)}
            className="flex items-center justify-center"
          >
            <BarChart className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Schedule Statistics</span>
            <span className="sm:hidden">Stats</span>
          </Button>
        </div>
      </div>
      
      {/* View Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode('day')}
            className={viewMode === 'day' ? 'bg-blue-50 border-blue-200' : ''}
          >
            Day
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode('week')}
            className={viewMode === 'week' ? 'bg-blue-50 border-blue-200' : ''}
          >
            Week
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode('month')}
            className={viewMode === 'month' ? 'bg-blue-50 border-blue-200' : ''}
          >
            Month
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium">
            {viewMode === 'day' && formatDate(currentDate)}
            {viewMode === 'week' && `Week of ${formatDate(getDaysToDisplay()[0])}`}
            {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block">
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 bg-white border-b">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="py-2 font-medium text-center border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'month' && (
            <div className="grid grid-cols-7">
              {getDaysToDisplay().map((date, index) => (
                <div key={index}>
                  {renderDayCell(date)}
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'week' && (
            <div className="grid grid-cols-7">
              {getDaysToDisplay().map((date, index) => (
                <div key={index}>
                  <div className="p-2 font-medium text-center border-b border-r">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                    <div className="text-sm font-normal">
                      {date.getDate()}
                    </div>
                  </div>
                  {renderDayCell(date)}
                </div>
              ))}
            </div>
          )}
          
          {viewMode === 'day' && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">
                  {formatDate(currentDate)}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenShiftDialog(currentDate)}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Shift
                </Button>
              </div>
              
              {/* Time-off indicators */}
              {timeOffData[getDateKey(currentDate)]?.length > 0 && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded">
                  <div className="font-medium flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Staff on Time Off:
                  </div>
                  {timeOffData[getDateKey(currentDate)].map(staff => (
                    <div key={staff.staffId} className="ml-5 mt-1 flex items-center">
                      <span>• {staff.name}</span>
                      <span className="ml-2 text-xs bg-red-100 px-2 py-0.5 rounded">
                        {staff.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-4">
                {getShiftsForDate(currentDate).length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No shifts scheduled for this day</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Click the 'Add Shift' button to schedule staff
                    </p>
                  </div>
                ) : (
                  getShiftsForDate(currentDate).map(shift => {
                    const staff = staffMembers.find(member => member.id === shift.staffId);
                    // Check if this staff member has time off on this date
                    const hasTimeOff = timeOffData[getDateKey(currentDate)]?.some(to => to.staffId === shift.staffId);
                    
                    return (
                      <div
                        key={shift.id}
                        className={`flex justify-between items-center p-4 border rounded-lg hover:bg-blue-50 cursor-pointer ${
                          hasTimeOff ? 'bg-red-50 border-red-200' : ''
                        }`}
                        onClick={() => handleOpenShiftDialog(currentDate, null, shift)}
                      >
                        <div>
                          <div className="font-medium flex items-center">
                            {staff?.name || 'Unknown'}
                            {hasTimeOff && (
                              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                Time Off
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-blue-600">{shift.shift}</div>
                          {shift.notes && (
                            <div className="text-sm text-gray-500 mt-1">{shift.notes}</div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShiftDialog(currentDate, null, shift);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(currentDate);
                              setExistingShiftId(shift.id);
                              deleteShift();
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Views */}
        {viewMode === 'day' && renderMobileDayView()}
        {viewMode === 'week' && renderMobileWeekView()}
        {viewMode === 'month' && renderMobileMonthView()}
      </Card>
      
      {/* Shift Assignment Dialog */}
      <SimpleDialog
        open={showShiftDialog}
        onClose={() => setShowShiftDialog(false)}
        title={shiftDialogMode === 'create' ? "Add New Shift" : "Edit Shift"}
        description={selectedDate ? formatDate(selectedDate) : ''}
        footer={
          <>
            {shiftDialogMode === 'edit' && (
              <Button 
                variant="outline" 
                onClick={deleteShift}
                className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveShift}>
              {shiftDialogMode === 'create' ? "Create" : "Update"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="staff-select">Staff Member</Label>
            <select
              id="staff-select"
              value={selectedShift.staffId}
              onChange={(e) => setSelectedShift({
                ...selectedShift,
                staffId: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select staff member</option>
              {staffMembers.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name || 'No name'} {staff.certificationLevel ? `(${staff.certificationLevel})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input 
                id="start-time" 
                type="time"
                value={selectedShift.startTime}
                onChange={(e) => setSelectedShift({
                  ...selectedShift,
                  startTime: e.target.value
                })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input 
                id="end-time" 
                type="time"
                value={selectedShift.endTime}
                onChange={(e) => setSelectedShift({
                  ...selectedShift,
                  endTime: e.target.value
                })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="shift-notes">Notes (optional)</Label>
            <Textarea 
              id="shift-notes" 
              value={selectedShift.notes}
              onChange={(e) => setSelectedShift({
                ...selectedShift,
                notes: e.target.value
              })}
              placeholder="E.g., Training session, On-call, etc."
              className="mt-1 resize-none h-20"
            />
          </div>
          
          {/* Time-off check button */}
          {selectedShift.staffId && selectedDate && (
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-0 top-0 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={async () => {
                  const conflicts = await checkForScheduleConflicts(
                    selectedShift.staffId,
                    selectedDate,
                    selectedShift.startTime || '09:00',
                    selectedShift.endTime || '17:00',
                    shiftDialogMode === 'edit' ? existingShiftId : null
                  );
                  
                  const timeOffConflicts = conflicts.filter(c => c.type === 'timeOff');
                  if (timeOffConflicts.length > 0) {
                    alert(`This staff member has approved time-off for this date:\n\n${
                      timeOffConflicts.map(c => c.message).join('\n')
                    }`);
                  } else {
                    alert('No time-off conflicts found for this date.');
                  }
                }}
              >
                Check Time-Off
              </Button>
            </div>
          )}
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">Shift Preview:</p>
            <p className="text-sm font-medium mt-1">
              {selectedShift.startTime && selectedShift.endTime ? (
                `${formatTimeWithAMPM(selectedShift.startTime)} - ${formatTimeWithAMPM(selectedShift.endTime)}`
              ) : (
                'Please select both start and end times'
              )}
            </p>
          </div>
        </div>
      </SimpleDialog>
      
      {/* Time Card Report Dialog */}
      <SimpleDialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        title="Time Card Report"
        description={`${reportDateRange.start.toLocaleDateString()} - ${reportDateRange.end.toLocaleDateString()}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Close
            </Button>
            <Button 
              className="flex items-center"
              onClick={exportTimeCardCSV}
              disabled={timeCardData.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="w-full sm:w-1/2">
                <Label htmlFor="report-start-date">Start Date</Label>
                <Input 
                  id="report-start-date" 
                  type="date"
                  value={reportDateRange.start.toISOString().substring(0, 10)}
                  onChange={(e) => setReportDateRange({
                    ...reportDateRange,
                    start: new Date(e.target.value)
                  })}
                  className="mt-1"
                />
              </div>
              
              <div className="w-full sm:w-1/2">
                <Label htmlFor="report-end-date">End Date</Label>
                <Input 
                  id="report-end-date" 
                  type="date"
                  value={reportDateRange.end.toISOString().substring(0, 10)}
                  onChange={(e) => setReportDateRange({
                    ...reportDateRange,
                    end: new Date(e.target.value)
                  })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <Button 
              onClick={generateTimeCardReport}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh Report
            </Button>
          </div>
          
          {timeCardData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No time card data available for the selected period</p>
            </div>
          ) : (
            <div className="space-y-6">
              {timeCardData.map(staff => (
                <div key={staff.staffId} className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
                    <h3 className="font-medium">{staff.staffName}</h3>
                    <div className="font-mono text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded">
                      {staff.totalHours}
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="text-sm font-medium mb-2">Daily Breakdown:</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {staff.dailyBreakdown.map((day, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{day.displayDate}</span>
                          <div className="flex items-center">
                            <span className="font-mono">{day.totalTime}</span>
                            {day.isStillClockedIn && (
                              <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                Still clocked in
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SimpleDialog>
      
      {/* Schedule Statistics Dialog */}
      <SimpleDialog
        open={showStatsDialog}
        onClose={() => setShowStatsDialog(false)}
        title="Schedule Statistics"
        description={`${statsDateRange.start.toLocaleDateString()} - ${statsDateRange.end.toLocaleDateString()}`}
        footer={
          <Button variant="outline" onClick={() => setShowStatsDialog(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="w-full sm:w-1/2">
                <Label htmlFor="stats-start-date">Start Date</Label>
                <Input 
                  id="stats-start-date" 
                  type="date"
                  value={statsDateRange.start.toISOString().substring(0, 10)}
                  onChange={(e) => setStatsDateRange({
                    ...statsDateRange,
                    start: new Date(e.target.value)
                  })}
                  className="mt-1"
                />
              </div>
              
              <div className="w-full sm:w-1/2">
                <Label htmlFor="stats-end-date">End Date</Label>
                <Input 
                  id="stats-end-date" 
                  type="date"
                  value={statsDateRange.end.toISOString().substring(0, 10)}
                  onChange={(e) => setStatsDateRange({
                    ...statsDateRange,
                    end: new Date(e.target.value)
                  })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <ScheduleStatistics 
            scheduleData={scheduleData}
            staffMembers={staffMembers}
            startDate={statsDateRange.start}
            endDate={statsDateRange.end}
          />
        </div>
      </SimpleDialog>
      
      {/* Bulk Schedule Dialog */}
      <SimpleDialog
        open={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        title="Create Bulk Schedule"
        description="Quickly create schedules for multiple staff members across a date range"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createBulkSchedule}
              disabled={bulkScheduleData.staffIds.length === 0 || bulkScheduleData.daysOfWeek.length === 0}
            >
              Create Schedules
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bulk-start-date">Start Date</Label>
              <Input 
                id="bulk-start-date" 
                type="date"
                value={bulkScheduleData.startDate.toISOString().substring(0, 10)}
                onChange={(e) => setBulkScheduleData({
                  ...bulkScheduleData,
                  startDate: new Date(e.target.value)
                })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="bulk-end-date">End Date</Label>
              <Input 
                id="bulk-end-date" 
                type="date"
                value={bulkScheduleData.endDate.toISOString().substring(0, 10)}
                onChange={(e) => setBulkScheduleData({
                  ...bulkScheduleData,
                  endDate: new Date(e.target.value)
                })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label>Days of Week</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { day: 1, label: 'Mon' },
                { day: 2, label: 'Tue' },
                { day: 3, label: 'Wed' },
                { day: 4, label: 'Thu' },
                { day: 5, label: 'Fri' },
                { day: 6, label: 'Sat' },
                { day: 0, label: 'Sun' }
              ].map(({ day, label }) => (
                <Button
                  key={day}
                  type="button"
                  variant={bulkScheduleData.daysOfWeek.includes(day) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDayOfWeek(day)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Default hours: Mon-Fri 11am-7pm, Sat 10am-6pm, Sun closed
            </p>
          </div>
          
          <div>
            <Label>Select Staff Members</Label>
            <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
              {staffMembers.map(staff => (
                <div 
                  key={staff.id}
                  className={`flex items-center p-2 cursor-pointer hover:bg-gray-50 ${
                    bulkScheduleData.staffIds.includes(staff.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleStaffSelection(staff.id)}
                >
                  <input 
                    type="checkbox" 
                    checked={bulkScheduleData.staffIds.includes(staff.id)}
                    onChange={() => {}}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium">{staff.name || 'No name'}</div>
                    {staff.certificationLevel && (
                      <div className="text-xs text-gray-500">{staff.certificationLevel}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">Summary:</div>
            <p className="text-sm">
              Creating shifts from <span className="font-medium">{bulkScheduleData.startDate.toLocaleDateString()}</span> to <span className="font-medium">{bulkScheduleData.endDate.toLocaleDateString()}</span>
            </p>
            <p className="text-sm">
              Days: <span className="font-medium">{bulkScheduleData.daysOfWeek.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}</span>
            </p>
            <p className="text-sm">
              Staff: <span className="font-medium">{bulkScheduleData.staffIds.length} selected</span>
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Each day will use its default hours: Mon-Fri 11am-7pm, Sat 10am-6pm
            </p>
          </div>
          
          <div className="bg-amber-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-amber-800 flex items-center mb-2">
              <AlertCircle className="h-4 w-4 mr-1" />
              Time-Off Handling:
            </div>
            <p className="text-sm text-amber-700">
              Staff with approved time-off during the selected period will not be scheduled for those dates.
            </p>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
};

export default AdminScheduleBuilder;