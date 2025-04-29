// src/components/Team/TimeOffRequest.jsx
import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Calendar,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { getDateKey, formatDate, } from '../../utils/dateUtils';
import SimpleDialog from '../ui/SimpleDialog';
import { useUserProfile } from '../../hooks/useUserProfile';
import ErrorDisplay from '../ui/ErrorDisplay';
import LoadingSpinner from '../ui/LoadingSpinner';

const TimeOffRequest = () => {
  const { user } = useAuth();
  const { userProfile: currentUserProfile, isAdmin } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for time-off requests
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, denied
  
  // State for request dialog
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: getDateKey(new Date()),
    endDate: getDateKey(new Date(new Date().setDate(new Date().getDate() + 1))),
    reason: '',
    notes: ''
  });
  
  // State for review dialog (admin only)
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  
  
  
  // Fetch time-off requests based on user role
  useEffect(() => {
    const fetchTimeOffRequests = async () => {
      if (!currentUserProfile) return;
      
      try {
        setLoading(true);
        
        let requestQuery;
        
        if (isAdmin) {
          // Admins can see all requests
          requestQuery = query(
            collection(db, 'timeOffRequests'),
            orderBy('requestedAt', 'desc')
          );
        } else {
          // Regular users can only see their own requests
          requestQuery = query(
            collection(db, 'timeOffRequests'),
            where('staffId', '==', currentUserProfile.id),
            orderBy('requestedAt', 'desc')
          );
        }
        
        const requestSnapshot = await getDocs(requestQuery);
        const requestList = requestSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTimeOffRequests(requestList);
        filterRequests(requestList, statusFilter);
      } catch (err) {
        setError('Error loading time-off requests');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimeOffRequests();
}, [currentUserProfile, isAdmin, statusFilter]);
  
  // Filter requests by status
  const filterRequests = (requests, status) => {
    if (status === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(request => request.status === status));
    }
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    filterRequests(timeOffRequests, status);
  };
  
  // Submit a new time-off request
  const submitTimeOffRequest = async () => {
    if (!currentUserProfile) return;
    
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.reason) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Validate dates
    const startDate = new Date(newRequest.startDate);
    const endDate = new Date(newRequest.endDate);
    
    if (endDate < startDate) {
      alert('End date cannot be before start date');
      return;
    }
    
    try {
      setLoading(true);
      
      // Add the new request to Firestore
      await addDoc(collection(db, 'timeOffRequests'), {
        staffId: currentUserProfile.id,
        staffName: currentUserProfile.name || 'Unknown',
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        reason: newRequest.reason,
        notes: newRequest.notes,
        status: 'pending',
        requestedAt: serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null
      });
      
      // Reset form and close dialog
      setNewRequest({
        startDate: getDateKey(new Date()),
        endDate: getDateKey(new Date(new Date().setDate(new Date().getDate() + 1))),
        reason: '',
        notes: ''
      });
      
      setShowRequestDialog(false);
      
      // Refresh requests
      const requestQuery = query(
        collection(db, 'timeOffRequests'),
        where('staffId', '==', currentUserProfile.id),
        orderBy('requestedAt', 'desc')
      );
      
      const requestSnapshot = await getDocs(requestQuery);
      const requestList = requestSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTimeOffRequests(requestList);
      filterRequests(requestList, statusFilter);
    } catch (err) {
      setError('Error submitting time-off request');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Open review dialog for a request (admin only)
  const handleReviewRequest = (request) => {
    if (!isAdmin) return;
    
    setSelectedRequest(request);
    setReviewNotes(request.reviewNotes || '');
    setShowReviewDialog(true);
  };
  
  // Update request status (admin only)
  const updateRequestStatus = async (status) => {
    if (!isAdmin || !selectedRequest) return;
    
    try {
      setLoading(true);
      
      // Update the request in Firestore
      const requestRef = doc(db, 'timeOffRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        status,
        reviewedBy: user.email,
        reviewedAt: serverTimestamp(),
        reviewNotes
      });
      
      // Close dialog
      setShowReviewDialog(false);
      
      // Refresh requests
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
      filterRequests(requestList, statusFilter);
    } catch (err) {
      setError('Error updating time-off request');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a request (only the user who created it or an admin can delete)
  const deleteRequest = async (requestId) => {
    if (!currentUserProfile) return;
    
    // Find the request
    const request = timeOffRequests.find(r => r.id === requestId);
    
    if (!request) return;
    
    // Check permissions (only allow users to delete their own pending requests, admins can delete any)
    if (!isAdmin && (request.staffId !== currentUserProfile.id || request.status !== 'pending')) {
      alert('You can only delete your own pending requests');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this time-off request?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Delete the request from Firestore
      await deleteDoc(doc(db, 'timeOffRequests', requestId));
      
      // Refresh requests
      let requestQuery;
      
      if (isAdmin) {
        requestQuery = query(
          collection(db, 'timeOffRequests'),
          orderBy('requestedAt', 'desc')
        );
      } else {
        requestQuery = query(
          collection(db, 'timeOffRequests'),
          where('staffId', '==', currentUserProfile.id),
          orderBy('requestedAt', 'desc')
        );
      }
      
      const requestSnapshot = await getDocs(requestQuery);
      const requestList = requestSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTimeOffRequests(requestList);
      filterRequests(requestList, statusFilter);
    } catch (err) {
      setError('Error deleting time-off request');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Time-Off Requests</h2>
          <p className="text-sm text-gray-600">
            {isAdmin 
              ? 'Review and manage team time-off requests' 
              : 'Submit and track your time-off requests'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Request button - visible to everyone */}
          <Button 
            onClick={() => setShowRequestDialog(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Request
          </Button>
        </div>
      </div>
      
      {/* Status filter - tabs for different statuses */}
      <div className="flex flex-wrap gap-2 border-b">
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'all' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleStatusFilterChange('all')}
        >
          All Requests
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'pending' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleStatusFilterChange('pending')}
        >
          <Clock className="h-4 w-4 mr-1 text-amber-500" />
          Pending
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'approved' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleStatusFilterChange('approved')}
        >
          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
          Approved
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className={statusFilter === 'denied' ? 'border-b-2 border-blue-500 rounded-none' : 'rounded-none'}
          onClick={() => handleStatusFilterChange('denied')}
        >
          <XCircle className="h-4 w-4 mr-1 text-red-500" />
          Denied
        </Button>
      </div>
      
      {error && <ErrorDisplay error={error} className="mb-4" />}
      
      {/* List of requests */}
      <div className="space-y-4 mt-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No time-off requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter === 'all' 
                ? 'Click "New Request" to submit a time-off request' 
                : `No ${statusFilter} requests found`}
            </p>
          </div>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                  {/* Show staff name only for admins */}
                  {isAdmin && (
                    <h3 className="font-medium text-gray-900">
                      {request.staffName || 'Unknown Staff'}
                    </h3>
                  )}
                  
                  {/* Request status badge */}
                  <div className={`
                    rounded-full px-3 py-1 text-xs font-medium
                    ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                    ${request.status === 'approved' ? 'bg-green-100 text-green-700' : ''}
                    ${request.status === 'denied' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {request.status === 'pending' && (
                      <>
                        <Clock className="h-3 w-3 inline mr-1" />
                        Pending
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div>
                    <div className="text-xs text-gray-500">Date Range</div>
                    <div className="text-sm font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(request.startDate)} – {formatDate(request.endDate)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500">Reason</div>
                    <div className="text-sm">{request.reason}</div>
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
                  {/* Regular users can delete their own pending requests */}
                  {(!isAdmin && request.status === 'pending') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteRequest(request.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                  
                  {/* Admins can review pending requests or delete any request */}
                  {isAdmin && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* New Request Dialog */}
      <SimpleDialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        title="Request Time Off"
        description="Submit a new time-off request"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitTimeOffRequest}>
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date" 
                type="date"
                value={newRequest.startDate}
                onChange={(e) => setNewRequest({
                  ...newRequest,
                  startDate: e.target.value
                })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date" 
                type="date"
                value={newRequest.endDate}
                onChange={(e) => setNewRequest({
                  ...newRequest,
                  endDate: e.target.value
                })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="reason">Reason</Label>
            <select
              id="reason"
              value={newRequest.reason}
              onChange={(e) => setNewRequest({
                ...newRequest,
                reason: e.target.value
              })}
              className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select reason...</option>
              <option value="Vacation">Vacation</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Personal">Personal</option>
              <option value="Family">Family</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              value={newRequest.notes}
              onChange={(e) => setNewRequest({
                ...newRequest,
                notes: e.target.value
              })}
              placeholder="Add any additional details about your request"
              className="mt-1 resize-none h-20"
            />
          </div>
        </div>
      </SimpleDialog>
      
      {/* Review Request Dialog (Admin Only) */}
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
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-gray-500">Reason</div>
                <div>{selectedRequest.reason}</div>
              </div>
              
              {selectedRequest.notes && (
                <div>
                  <div className="text-xs text-gray-500">Additional Notes</div>
                  <div className="text-sm">{selectedRequest.notes}</div>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="review-notes">Review Notes (Optional)</Label>
              <Textarea 
                id="review-notes" 
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes for the team member"
                className="mt-1 resize-none h-20"
              />
            </div>
          </div>
        )}
      </SimpleDialog>
    </div>
  );
};

export default TimeOffRequest;