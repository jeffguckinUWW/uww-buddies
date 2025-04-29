// src/utils/dateUtils.js

/**
 * Format date as YYYY-MM-DD string
 * @param {Date} date - JavaScript Date object
 * @returns {string} Formatted date string
 */
export const getDateKey = (date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  };
  
  /**
   * Format date string or Date object as readable format
   * @param {string|Date} dateInput - Date string in YYYY-MM-DD format or Date object
   * @returns {string} Formatted date string
   */
  export const formatDate = (dateInput) => {
    if (!dateInput) return '';
    
    // Handle if a Date object is passed
    if (dateInput instanceof Date) {
      return dateInput.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Handle string dates in YYYY-MM-DD format
    try {
      const [year, month, day] = dateInput.split('-').map(num => parseInt(num, 10));
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      // If we can't parse it as a string, try to create a new Date from it
      try {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
        }
      } catch (e) {
        // Last resort fallback
        console.error('Failed to format date', e);
      }
      return String(dateInput);
    }
  };
  
  /**
   * Calculate duration between two dates in days
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {number} Duration in days (inclusive)
   */
  export const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set to same time of day to avoid partial day calculations
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // Add 1 to include both start and end days
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };
  
  /**
   * Format a time string with AM/PM
   * @param {string} timeStr - Time string in 24-hour format (HH:MM)
   * @returns {string} Formatted time with AM/PM
   */
  export const formatTimeWithAMPM = (timeStr) => {
    if (!timeStr) return '';
    
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    const period = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''}${period}`;
  };