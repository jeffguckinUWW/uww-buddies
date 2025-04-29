// src/components/Admin/AdminTimeOffManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
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
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  FileText,
  Filter,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';
import SimpleDialog from '../ui/SimpleDialog';
import { checkForScheduleConflicts } from '../../utils/scheduleConflictUtils';
import LoadingSpinner from '../ui/LoadingSpinner';


// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Calculate duration in days
const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to same time of day to avoid partial day calculations
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Add 1 to include both start and end days
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const AdminTimeOffManager = () => {
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, denied
  const [staffFilter, setStaffFilter] = useState('all'); // all or specific staff ID
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start: '',
    end: ''
  });
  
  // State for review dialog
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  
  // State for filter dialog
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Fetch all staff members
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
  
  // Fetch all time-off requests
  useEffect(() => {
    const fetchTimeOffRequests = async () => {
      try {
        setLoading(true);
        
        // Query all time-off requests ordered by date and status
        const requestQuery = query(
          collection(db, 'timeOffRequests'),
          orderBy('requestedAt', 'desc')
        );
        
        const requestSnapshot = await getDocs(requestQuery);
        const requestList = requestSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTimeOffRequests(requestList);
        applyFilters(requestList, statusFilter, staffFilter, dateRangeFilter);
      } catch (err) {
        console.error('Error fetching time-off requests:', err);
        setError('Failed to load time-off requests');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeOffRequests();
}, [dateRangeFilter, staffFilter, statusFilter]);
  
  // Apply filters to time-off requests
  const applyFilters = (requests, status, staffId, dateRange) => {
    let filtered = [...requests];
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(request => request.status === status);
    }
    
    // Apply staff filter
    if (staffId !== 'all') {
      filtered = filtered.filter(request => request.staffId === staffId);
    }
    
    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      // Include requests that overlap with the filter date range
      filtered = filtered.filter(request => {
        const requestStart = new Date(request.startDate);
        const requestEnd = new Date(request.endDate);
        
        // If request starts before filter end AND request ends after filter start
        return requestStart <= endDate && requestEnd >= startDate;
      });
    }
    
    setFilteredRequests(filtered);
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    let newStatusFilter = statusFilter;
    let newStaffFilter = staffFilter;
    let newDateRange = { ...dateRangeFilter };
    
    if (filterType === 'status') {
      newStatusFilter = value;
      setStatusFilter(value);
    } else if (filterType === 'staff') {
      newStaffFilter = value;
      setStaffFilter(value);
    } else if (filterType === 'dateStart') {
      newDateRange.start = value;
      setDateRangeFilter(prev => ({ ...prev, start: value }));
    } else if (filterType === 'dateEnd') {
      newDateRange.end = value;
      setDateRangeFilter(prev => ({ ...prev, end: value }));
    }
    
    applyFilters(timeOffRequests, newStatusFilter, newStaffFilter, newDateRange);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setStaffFilter('all');
    setDateRangeFilter({ start: '', end: '' });
    setFilteredRequests(timeOffRequests);
    setShowFilterDialog(false);
  };
  
  // Apply filter dialog changes
  const applyFilterDialogChanges = () => {
    applyFilters(timeOffRequests, statusFilter, staffFilter, dateRangeFilter);
    setShowFilterDialog(false);
  };
  
  // Handle opening review dialog
  const handleReviewRequest = (request) => {
    setSelectedRequest(request);
    setReviewNotes(request.reviewNotes || '');
    setShowReviewDialog(true);
  };
  
  // Update request status
  const updateRequestStatus = async (status) => {
    if (!selectedRequest) return;
    
    try {
      setLoading(true);

      if (status === 'approved') {
        // Fetch existing schedules that might conflict
        const startDate = new Date(selectedRequest.startDate);
        const endDate = new Date(selectedRequest.endDate);
        
        // Create an array of dates to check
        const datesToCheck = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          datesToCheck.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Check for conflicts on each date
        const allConflicts = [];
        for (const date of datesToCheck) {
          // Use 9am-5pm as default shift time to check for conflicts
          const conflicts = await checkForScheduleConflicts(
            selectedRequest.staffId,
            date,
            '09:00',
            '17:00'
          );
          
          if (conflicts.length > 0) {
            allConflicts.push({
              date,
              conflicts
            });
          }
        }
        
        // If conflicts found, show warning
        if (allConflicts.length > 0) {
          const confirmApproval = window.confirm(
            `This time-off request conflicts with ${allConflicts.length} scheduled shifts. ` +
            `Do you want to approve it anyway? If approved, the system will prevent new shifts ` +
            `from being scheduled during this time period.`
          );
          
          if (!confirmApproval) {
            setLoading(false);
            return;
          }
        }
      }
      
      // Update the request in Firestore
      const requestRef = doc(db, 'timeOffRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        status,
        reviewedBy: 'admin', // Replace with actual admin info when available
        reviewedAt: serverTimestamp(),
        reviewNotes
      });
      
      // Close dialog
      setShowReviewDialog(false);
      
      // Update local state
      const updatedRequests = timeOffRequests.map(request => {
        if (request.id === selectedRequest.id) {
          return {
            ...request,
            status,
            reviewedBy: 'admin',
            reviewNotes
          };
        }
        return request;
      });
      
      setTimeOffRequests(updatedRequests);
      applyFilters(updatedRequests, statusFilter, staffFilter, dateRangeFilter);
    } catch (err) {
      console.error('Error updating time-off request:', err);
      setError('Failed to update time-off request');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a request
  const deleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this time-off request?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete the request from Firestore
      await deleteDoc(doc(db, 'timeOffRequests', requestId));
      
      // Update local state
      const updatedRequests = timeOffRequests.filter(request => request.id !== requestId);
      setTimeOffRequests(updatedRequests);
      applyFilters(updatedRequests, statusFilter, staffFilter, dateRangeFilter);
    } catch (err) {
      console.error('Error deleting time-off request:', err);
      setError('Failed to delete time-off request');
    } finally {
      setLoading(false);
    }
  };
  
  // Get status counts for badge displays
  const getStatusCounts = () => {
    return {
      pending: timeOffRequests.filter(r => r.status === 'pending').length,
      approved: timeOffRequests.filter(r => r.status === 'approved').length,
      denied: timeOffRequests.filter(r => r.status === 'denied').length
    };
  };
  
  const statusCounts = getStatusCounts();
  
  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Time-Off Request Management
          </h1>
          <div className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full mt-2 md:mt-0">
            Admin Mode
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Review and manage time-off requests from your team members
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilterDialog(true)}
            className="flex items-center"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {(statusFilter !== 'all' || staffFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
              <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-2 text-xs">
                Active
              </span>
            )}
          </Button>
        </div>
      </div>
      
      {/* Status filter - tabs for different statuses */}
      <div className="flex flex-wrap gap-2 border-b">
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'all' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleFilterChange('status', 'all')}
        >
          All Requests
          <span className="ml-1 bg-gray-100 text-gray-700 rounded-full px-2 text-xs">
            {timeOffRequests.length}
          </span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'pending' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleFilterChange('status', 'pending')}
        >
          <Clock className="h-4 w-4 mr-1 text-amber-500" />
          Pending
          <span className="ml-1 bg-amber-100 text-amber-700 rounded-full px-2 text-xs">
            {statusCounts.pending}
          </span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'approved' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleFilterChange('status', 'approved')}
        >
          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
          Approved
          <span className="ml-1 bg-green-100 text-green-700 rounded-full px-2 text-xs">
            {statusCounts.approved}
          </span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'denied' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleFilterChange('status', 'denied')}
        >
          <XCircle className="h-4 w-4 mr-1 text-red-500" />
          Denied
          <span className="ml-1 bg-red-100 text-red-700 rounded-full px-2 text-xs">
            {statusCounts.denied}
          </span>
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {/* List of requests */}
      <div className="space-y-4 mt-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No time-off requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter !== 'all' || staffFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end
                ? 'Try adjusting your filters to see more results'
                : 'Time-off requests will appear here once team members submit them'}
            </p>
          </div>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {request.staffName || 'Unknown Staff'}
                  </h3>
                  
                  {/* Request status badge */}
                  <div className={`
                    rounded-full px-3 py-1 text-xs font-medium mt-2 sm:mt-0
                    ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                    ${request.status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                    ${request.status === 'denied' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {request.status === 'pending' && (
                      <>
                        <Clock className="h-3 w-3 inline mr-1" />
                        Pending Review
                      </>
                    )}
                    {request.status === 'approved' && (
                      <>
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Approved
                      </>
                    )}
                    {request.status === 'denied' && (
                      <>
                        <XCircle className="h-3 w-3 inline mr-1" />
                        Denied
                      </>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-500">Date Range</div>
                    <div className="text-sm font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(request.startDate)} – {formatDate(request.endDate)}
                    </div>
                    <div className="text-xs text-blue-600">
                      {calculateDuration(request.startDate, request.endDate)} day(s)
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500">Reason</div>
                    <div className="text-sm">{request.reason}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500">Requested</div>
                    <div className="text-sm">
                      {request.requestedAt?.seconds 
                        ? new Date(request.requestedAt.seconds * 1000).toLocaleDateString() 
                        : 'Unknown date'}
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                {request.notes && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <FileText className="h-3 w-3 inline mr-1" />
                    {request.notes}
                  </div>
                )}
                
                {/* Review notes (only show if request has been reviewed) */}
                {request.reviewNotes && (request.status === 'approved' || request.status === 'denied') && (
                  <div className={`mt-2 text-xs p-2 rounded ${
                    request.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    <span className="font-medium">Admin response:</span> {request.reviewNotes}
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex justify-end mt-3 space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteRequest(request.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  
                  {request.status === 'pending' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReviewRequest(request)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Review Request Dialog */}
      <SimpleDialog
        open={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        title="Review Time-Off Request"
        description={selectedRequest ? `Request from ${selectedRequest.staffName || 'Unknown Staff'}` : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              className="bg-red-50 text-red-600 hover:bg-red-100"
              onClick={() => updateRequestStatus('denied')}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Deny
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => updateRequestStatus('approved')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </>
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-xs text-gray-500">Start Date</div>
                  <div className="font-medium">{formatDate(selectedRequest.startDate)}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">End Date</div>
                  <div className="font-medium">{formatDate(selectedRequest.endDate)}</div>
                </div>
                
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Duration</div>
                  <div className="font-medium">
                    {calculateDuration(selectedRequest.startDate, selectedRequest.endDate)} day(s)
                  </div>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-gray-500">Reason</div>
                <div className="font-medium">{selectedRequest.reason}</div>
              </div>
              
              {selectedRequest.notes && (
                <div>
                  <div className="text-xs text-gray-500">Additional Notes</div>
                  <div className="text-sm">{selectedRequest.notes}</div>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="review-notes">Review Notes</Label>
              <Textarea 
                id="review-notes" 
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes to explain your decision (optional)"
                className="mt-1 resize-none h-20"
              />
            </div>
            
            <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              <span className="font-medium">Note:</span> Approving this request will prevent scheduling
              conflicts. The system will warn about conflicts when creating schedules during this time period.
            </div>
          </div>
        )}
      </SimpleDialog>
      
      {/* Filter Dialog */}
      <SimpleDialog
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        title="Filter Time-Off Requests"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="mr-auto"
            >
              Clear Filters
            </Button>
            <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyFilterDialogChanges}>
              Apply Filters
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="status-filter">Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="staff-filter">Staff Member</Label>
            <select
              id="staff-filter"
              value={staffFilter}
              onChange={(e) => handleFilterChange('staff', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Staff Members</option>
              {staffMembers.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name || 'Unnamed Staff'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date-start">Date Range Start</Label>
              <Input 
                id="date-start" 
                type="date"
                value={dateRangeFilter.start}
                onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="date-end">Date Range End</Label>
              <Input 
                id="date-end" 
                type="date"
                value={dateRangeFilter.end}
                onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <CalendarIcon className="h-4 w-4 inline mr-1 text-blue-600" />
            <span className="text-blue-700">Note:</span> Date range filter will show all time-off
            requests that overlap with this period, even partially.
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
};

export default AdminTimeOffManager;