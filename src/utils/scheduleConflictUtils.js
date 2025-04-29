// src/utils/scheduleConflictUtils.js

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Utility to check for scheduling conflicts
 * @param {string} staffId - The staff member's ID
 * @param {Date} date - The date to check
 * @param {string} startTime - The shift start time (HH:MM format)
 * @param {string} endTime - The shift end time (HH:MM format)
 * @param {string} existingShiftId - ID of an existing shift to exclude from conflict check
 * @returns {Promise<Array>} - Array of conflicts found
 */
export const checkForScheduleConflicts = async (
  staffId, 
  date, 
  startTime, 
  endTime, 
  existingShiftId = null,
  scheduleData = {}
) => {
  // Format date as key for data storage (YYYY-MM-DD)
  const getDateKey = (date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };
  
  const dateKey = getDateKey(date);
  const shifts = scheduleData[dateKey] || [];
  
  // Convert time strings to minutes for easier comparison
  const convertTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    return hours * 60 + minutes;
  };
  
  const newShiftStart = convertTimeToMinutes(startTime);
  const newShiftEnd = convertTimeToMinutes(endTime);
  
  const conflicts = [];
  
  // 1. Check conflicts with other shifts
  shifts.forEach(shift => {
    // Skip comparing with itself when editing
    if (existingShiftId && shift.id === existingShiftId) return;
    
    // Skip shifts for other staff members
    if (shift.staffId !== staffId) return;
    
    // Parse existing shift times
    const [existingStartStr, existingEndStr] = shift.shift.split(' - ');
    
    // Convert AM/PM times to 24-hour format for comparison
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
    
    const existingStart = convertAMPMToMinutes(existingStartStr);
    const existingEnd = convertAMPMToMinutes(existingEndStr);
    
    // Check if shifts overlap
    if ((newShiftStart < existingEnd && newShiftEnd > existingStart)) {
      conflicts.push({
        shift,
        type: 'overlap',
        message: `Overlaps with existing shift: ${shift.shift}`
      });
    }
  });
  
  // 2. Check for time-off request conflicts
  try {
    // Query for approved time-off requests that overlap with the date
    const timeOffQuery = query(
      collection(db, 'timeOffRequests'),
      where('staffId', '==', staffId),
      where('status', '==', 'approved')
    );
    
    const timeOffSnapshot = await getDocs(timeOffQuery);
    const timeOffRequests = timeOffSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Check if date falls within any approved time-off period
    timeOffRequests.forEach(request => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const shiftDate = new Date(dateKey);
      
      // Normalize dates to compare just the date part
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      shiftDate.setHours(12, 0, 0, 0);
      
      if (shiftDate >= startDate && shiftDate <= endDate) {
        conflicts.push({
          request,
          type: 'timeOff',
          message: `Conflicts with approved time-off request (${request.startDate} to ${request.endDate}): ${request.reason}`
        });
      }
    });
  } catch (err) {
    console.error('Error checking time-off conflicts:', err);
  }
  
  return conflicts;
};

/**
 * Utility to check if a date has approved time-off for a staff member
 * @param {string} staffId - The staff member's ID
 * @param {Date} date - The date to check
 * @returns {Promise<Object|null>} - Time-off request object if found, null otherwise
 */
export const checkForTimeOff = async (staffId, date) => {
  const getDateKey = (date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };
  
  const dateKey = getDateKey(date);
  
  try {
    // Query for approved time-off requests
    const timeOffQuery = query(
      collection(db, 'timeOffRequests'),
      where('staffId', '==', staffId),
      where('status', '==', 'approved')
    );
    
    const timeOffSnapshot = await getDocs(timeOffQuery);
    const timeOffRequests = timeOffSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Check if date falls within any approved time-off period
    for (const request of timeOffRequests) {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const checkDate = new Date(dateKey);
      
      // Normalize dates to compare just the date part
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0);
      
      if (checkDate >= startDate && checkDate <= endDate) {
        return request;
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error checking time-off:', err);
    return null;
  }
};

/**
 * Fetch all upcoming time-off requests for a specific staff member
 * @param {string} staffId - The staff member's ID
 * @returns {Promise<Array>} - Array of time-off requests
 */
export const getUpcomingTimeOff = async (staffId) => {
  try {
    const currentDate = new Date();
    
    
    // Query for time-off requests that end on or after today
    const timeOffQuery = query(
      collection(db, 'timeOffRequests'),
      where('staffId', '==', staffId),
      where('status', '==', 'approved')
    );
    
    const timeOffSnapshot = await getDocs(timeOffQuery);
    const allTimeOff = timeOffSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter to only include current or future time-off
    return allTimeOff.filter(request => {
      const endDate = new Date(request.endDate);
      endDate.setHours(23, 59, 59, 999);
      return endDate >= currentDate;
    });
  } catch (err) {
    console.error('Error fetching upcoming time-off:', err);
    return [];
  }
};

/**
 * Fetch all pending time-off requests (admin use)
 * @returns {Promise<Array>} - Array of pending time-off requests
 */
export const getPendingTimeOffRequests = async () => {
  try {
    const timeOffQuery = query(
      collection(db, 'timeOffRequests'),
      where('status', '==', 'pending')
    );
    
    const timeOffSnapshot = await getDocs(timeOffQuery);
    return timeOffSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error('Error fetching pending time-off requests:', err);
    return [];
  }
};