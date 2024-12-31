import React, { useState, useEffect, memo} from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  Timestamp 
} from 'firebase/firestore';

// Tab options
const TABS = {
  LOGBOOK: 'logbook',
  STATS: 'stats',
  NEW_DIVE: 'newDive'
};

// Initial states
const initialStats = {
  totalDives: 0,
  maxDepth: 0,
  lastDive: null
};

const initialSearchFilters = {
  keyword: '',
  dateFrom: '',
  dateTo: ''
};

const initialFormData = {
  diveNumber: '',
  diveDate: new Date().toISOString().split('T')[0],
  location: '',
  bottomTime: '',
  maxDepth: '',
  buddy: '',
  notes: '',
  requiresSignature: false,
  signature: null
};

const initialInstructorSignature = {
  pinNumber: '',
  instructorId: '',
  instructorName: '',
  signatureDate: null,
  certificationLevel: ''
};

const Logbook = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.LOGBOOK);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [searchFilters, setSearchFilters] = useState(initialSearchFilters);
  const [editingLog, setEditingLog] = useState(null);
  const [nextDiveNumber, setNextDiveNumber] = useState(1);
  const [instructorSignature, setInstructorSignature] = useState(initialInstructorSignature);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureError, setSignatureError] = useState('');
  const [formData, setFormData] = useState(initialFormData);

  // Initial data fetch
  useEffect(() => {
    if (user?.uid) {
      fetchLogs();
      calculateNextDiveNumber();
    }
  }, [user]);

  // Helper Functions
  const calculateNextDiveNumber = async () => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, `profiles/${user.uid}/logbook`), 
          orderBy('diveNumber', 'desc')
        )
      );
      
      if (!querySnapshot.empty) {
        const highestNumber = querySnapshot.docs[0].data().diveNumber;
        setNextDiveNumber(highestNumber + 1);
      }
    } catch (error) {
      console.error('Error calculating next dive number:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const logRef = collection(db, `profiles/${user.uid}/logbook`);
      const q = query(logRef, orderBy('diveDate', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const logsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        diveDate: doc.data().diveDate.toDate()
      }));
      
      setLogs(logsData);
      updateStats(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const updateStats = (logsData) => {
    setStats({
      totalDives: logsData.length,
      maxDepth: Math.max(...logsData.map(log => log.maxDepth), 0),
      lastDive: logsData[0]?.diveDate || null
    });
  };

  // PIN and Signature Handling
  const verifyInstructorPin = async (pin) => {
    if (!pin || pin.length !== 6) {
      return { verified: false, error: 'PIN must be 6 digits' };
    }

    try {
      const profilesRef = collection(db, 'profiles');
      const q = query(
        profilesRef,
        where('role', '==', 'instructor'),
        where('instructorPin.pin', '==', pin)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const instructorData = querySnapshot.docs[0].data();
        return {
          verified: true,
          instructorId: querySnapshot.docs[0].id,
          instructorName: instructorData.name || 'Instructor',
          certificationLevel: instructorData.certificationLevel || 'Instructor'
        };
      }
      
      return { 
        verified: false, 
        error: 'Invalid PIN. Please check and try again.' 
      };
    } catch (error) {
      console.error('Verification error:', error);
      return { 
        verified: false, 
        error: error.code === 'permission-denied' 
          ? 'Permission denied. Please check your instructor status.'
          : 'Error verifying PIN. Please try again.'
      };
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setInstructorSignature(prev => ({
      ...prev,
      pinNumber: value
    }));
  };
  
  const handleSignature = async (e) => {
    e.preventDefault();
    setSignatureError('');
  
    if (!instructorSignature.pinNumber || instructorSignature.pinNumber.length !== 6) {
      setSignatureError('Please enter a valid 6-digit PIN');
      return;
    }
  
    const verification = await verifyInstructorPin(instructorSignature.pinNumber);
    
    if (verification.verified) {
      const signatureDate = new Date();
      
      setInstructorSignature(prev => ({
        ...prev,
        instructorId: verification.instructorId,
        instructorName: verification.instructorName,
        signatureDate
      }));
      
      setFormData(prev => ({
        ...prev,
        signature: {
          instructorId: verification.instructorId,
          instructorName: verification.instructorName,
          signatureDate: signatureDate,
          certificationLevel: 'Instructor'
        }
      }));
      
      setShowSignatureModal(false);
    } else {
      setSignatureError(verification.error || 'Invalid instructor PIN. Please try again.');
    }
  };

  // Form Handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // When signed, use existing values for protected fields
      const logData = {
        diveNumber: formData.signature ? formData.diveNumber : parseInt(formData.diveNumber),
        diveDate: formData.signature ? Timestamp.fromDate(new Date(formData.diveDate)) : Timestamp.fromDate(new Date(formData.diveDate)),
        location: formData.signature ? formData.location : formData.location,
        bottomTime: formData.signature ? formData.bottomTime : parseInt(formData.bottomTime),
        maxDepth: formData.signature ? formData.maxDepth : parseInt(formData.maxDepth),
        buddy: formData.signature ? formData.buddy : formData.buddy,
        notes: formData.signature ? formData.notes : formData.notes,
        requiresSignature: formData.requiresSignature,
        signature: formData.signature ? {
          instructorId: formData.signature.instructorId,
          instructorName: formData.signature.instructorName,
          signatureDate: Timestamp.fromDate(
            formData.signature.signatureDate instanceof Date 
              ? formData.signature.signatureDate 
              : new Date(formData.signature.signatureDate)
          ),
          certificationLevel: formData.signature.certificationLevel
        } : null
      };

      if (editingLog) {
        await setDoc(
          doc(db, `profiles/${user.uid}/logbook/${editingLog.id}`), 
          logData
        );
      } else {
        await addDoc(
          collection(db, `profiles/${user.uid}/logbook`), 
          logData
        );
      }

      setEditingLog(null);
      resetForm();
      fetchLogs();
      setActiveTab(TABS.LOGBOOK);
    } catch (error) {
      console.error('Error saving log:', error);
    }
};

  const handleDelete = async (logId) => {
    if (window.confirm('Are you sure you want to delete this log entry?')) {
      try {
        await deleteDoc(doc(db, `profiles/${user.uid}/logbook/${logId}`));
        fetchLogs();
      } catch (error) {
        console.error('Error deleting log:', error);
      }
    }
  };

  const handleEdit = (log) => {
    setFormData({
      diveNumber: log.diveNumber,
      diveDate: new Date(log.diveDate).toISOString().split('T')[0],
      location: log.location,
      bottomTime: log.bottomTime,
      maxDepth: log.maxDepth,
      buddy: log.buddy,
      notes: log.notes,
      requiresSignature: log.requiresSignature || false,
      signature: log.signature || null
    });
    setEditingLog(log);
    setActiveTab(TABS.NEW_DIVE);
  };

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      diveNumber: nextDiveNumber
    });
  };

  // Component Functions
  // Find this SignatureModal component in your Logbook.js and replace it with:

  const SignatureModal = memo(({ isVisible }) => {
    if (!isVisible) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Instructor Signature</h3>
          <form onSubmit={handleSignature} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Instructor PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={instructorSignature.pinNumber}
                onChange={(e) => setInstructorSignature(prev => ({
                  ...prev,
                  pinNumber: e.target.value
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter 6-digit PIN"
                maxLength={6}
              />
            </div>
  
            {signatureError && (
              <p className="text-red-600 text-sm">{signatureError}</p>
            )}
  
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Sign Log
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  });
  
  // Filter logs based on search criteria
  const filteredLogs = logs.filter(log => {
    let matchesKeyword = true;
    let matchesDateRange = true;

    if (searchFilters.keyword) {
      const keyword = searchFilters.keyword.toLowerCase();
      matchesKeyword = 
        log.location.toLowerCase().includes(keyword) ||
        log.notes?.toLowerCase().includes(keyword) ||
        log.buddy.toLowerCase().includes(keyword);
    }

    if (searchFilters.dateFrom) {
      matchesDateRange = log.diveDate >= new Date(searchFilters.dateFrom);
    }

    if (searchFilters.dateTo) {
      matchesDateRange = matchesDateRange && 
        log.diveDate <= new Date(searchFilters.dateTo);
    }

    return matchesKeyword && matchesDateRange;
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab(TABS.LOGBOOK)}
            className={`px-4 py-2 rounded-md ${
              activeTab === TABS.LOGBOOK 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            View Logbook
          </button>
          <button
            onClick={() => setActiveTab(TABS.STATS)}
            className={`px-4 py-2 rounded-md ${
              activeTab === TABS.STATS 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Quick Stats
          </button>
          <button
            onClick={() => {
              setActiveTab(TABS.NEW_DIVE);
              if (!editingLog) resetForm();
            }}
            className={`px-4 py-2 rounded-md ${
              activeTab === TABS.NEW_DIVE 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {editingLog ? 'Edit Dive' : 'New Dive'}
          </button>
        </div>

        {/* Stats View */}
        {activeTab === TABS.STATS && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700">Total Dives</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalDives}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700">Max Depth</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.maxDepth} ft</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-700">Last Dive</h3>
              <p className="text-3xl font-bold text-blue-600">
                {stats.lastDive ? new Date(stats.lastDive).toLocaleDateString() : 'No dives'}
              </p>
            </div>
          </div>
        )}

        {/* Logbook View */}
        {activeTab === TABS.LOGBOOK && (
          <div>
            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search by location, notes, or buddy"
                className="flex-1 min-w-[200px] px-3 py-2 border rounded-md"
                value={searchFilters.keyword}
                onChange={(e) => setSearchFilters(prev => ({ 
                  ...prev, 
                  keyword: e.target.value 
                }))}
              />
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm text-gray-600">From</label>
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md"
                    value={searchFilters.dateFrom}
                    onChange={(e) => setSearchFilters(prev => ({ 
                      ...prev, 
                      dateFrom: e.target.value 
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">To</label>
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md"
                    value={searchFilters.dateTo}
                    onChange={(e) => setSearchFilters(prev => ({ 
                      ...prev, 
                      dateTo: e.target.value 
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Dive Log List */}
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Dive #{log.diveNumber} - {log.location}
                      </h3>
                      <p className="text-gray-600">
                        {new Date(log.diveDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(log)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                      >
                        Edit
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Delete
                    </button>
                </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Max Depth:</span>
                      <span className="ml-2 font-medium">{log.maxDepth} ft</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bottom Time:</span>
                      <span className="ml-2 font-medium">{log.bottomTime} min</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Buddy:</span>
                      <span className="ml-2 font-medium">{log.buddy}</span>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="mt-2 text-sm text-gray-600">{log.notes}</p>
                  )}
                  {log.signature && (
  <div className="mt-2 p-2 bg-blue-50 rounded-md">
    <p className="text-sm text-blue-800">
      ✓ Signed by {log.signature.instructorName} 
      <span className="mx-1">•</span>
      {log.signature.certificationLevel}
      <span className="mx-1">•</span>
      {log.signature.signatureDate && log.signature.signatureDate.toDate 
        ? log.signature.signatureDate.toDate().toLocaleDateString()
        : new Date(log.signature.signatureDate).toLocaleDateString()}
    </p>
  </div>
)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New/Edit Dive Form */}
        {activeTab === TABS.NEW_DIVE && (
  <div>
    <h2 className="text-xl font-bold mb-6">
      {editingLog ? 'Edit Dive Entry' : 'New Dive Entry'}
    </h2>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Warning message for signed dives */}
      {formData.signature && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ This dive log is signed and cannot be edited unless the signature is removed.
          </p>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Dive Number
          </label>
          <input
            type="number"
            value={formData.diveNumber}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              diveNumber: e.target.value 
            }))}
            readOnly={formData.signature}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            value={formData.diveDate}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              diveDate: e.target.value 
            }))}
            readOnly={formData.signature}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            location: e.target.value 
          }))}
          readOnly={formData.signature}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          required
        />
      </div>

      {/* Dive Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bottom Time (minutes)
          </label>
          <input
            type="number"
            value={formData.bottomTime}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              bottomTime: e.target.value 
            }))}
            readOnly={formData.signature}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Depth (feet)
          </label>
          <input
            type="number"
            value={formData.maxDepth}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              maxDepth: e.target.value 
            }))}
            readOnly={formData.signature}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
          />
        </div>
      </div>

      {/* Buddy */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Dive Buddy
        </label>
        <input
          type="text"
          value={formData.buddy}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            buddy: e.target.value 
          }))}
          readOnly={formData.signature}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
          required
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            notes: e.target.value 
          }))}
          readOnly={formData.signature}
          rows={4}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            formData.signature ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* Signature Section */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="requiresSignature"
            checked={formData.requiresSignature}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              requiresSignature: e.target.checked 
            }))}
            readOnly={formData.signature}
            className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
              formData.signature ? 'cursor-not-allowed' : ''
            }`}
          />
          <label htmlFor="requiresSignature" className="text-sm font-medium text-gray-700">
            This dive requires instructor signature
          </label>
        </div>
        
        {formData.requiresSignature && !formData.signature && (
          <button
            type="button"
            onClick={() => setShowSignatureModal(true)}
            className="mt-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md"
          >
            Add Instructor Signature
          </button>
        )}
        
        {formData.signature && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Signed by: {formData.signature.instructorName}
              <br />
              Date: {formData.signature.signatureDate instanceof Date 
                ? formData.signature.signatureDate.toLocaleDateString()
                : new Date(formData.signature.signatureDate).toLocaleDateString()}
            </p>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, signature: null }))}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Remove Signature to Edit
            </button>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab(TABS.LOGBOOK);
            setEditingLog(null);
            resetForm();
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
  type="submit"
  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
>
  {editingLog ? 'Save Changes' : 'Add Log Entry'}
</button>
      </div>
    </form>
  </div>
)}

<SignatureModal isVisible={showSignatureModal} />

      </div>
    </div>
  );
};

export default Logbook;