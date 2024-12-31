import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import LogbookEntry from './LogbookEntry';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  Timestamp,
  writeBatch
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
  totalBottomTime: 0,
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
  timeIn: '',
  timeOut: '',
  maxDepth: '',
  buddy: '',
  notes: '',
  requiresSignature: false,
  signature: null,
  visibility: '',
  airTemp: '',
  waterTemp: '',
  tankPressureStart: '',
  tankPressureEnd: '',
  tankVolume: '',
  diveType: {
    lake: false,
    river: false,
    ocean: false,
    shore: false,
    boat: false,
    wreck: false,
    drift: false,
    night: false
  },
  weather: {
    condition: 'sunny',
    windSpeed: ''
  },
  equipment: {
    wetsuit: false,
    drysuit: false,
    hood: false,
    gloves: false
  }
};

const initialInstructorSignature = {
  pinNumber: '',
  instructorId: '',
  instructorName: '',
  signatureDate: null,
  certificationLevel: ''
};

const initialLoadingState = {
  logs: false,
  submission: false,
  signature: false,
  delete: false
};

const Logbook = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.STATS);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [searchFilters, setSearchFilters] = useState(initialSearchFilters);
  const [editingLog, setEditingLog] = useState(null);
  const [nextDiveNumber, setNextDiveNumber] = useState(1);
  const [instructorSignature, setInstructorSignature] = useState(initialInstructorSignature);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureError, setSignatureError] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [error, setError] = useState('');

  // Memoized filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      let matchesKeyword = true;
      let matchesDateRange = true;

      if (searchFilters.keyword) {
        const keyword = searchFilters.keyword.toLowerCase();
        matchesKeyword = 
          log.location?.toLowerCase().includes(keyword) ||
          log.notes?.toLowerCase().includes(keyword) ||
          log.buddy?.toLowerCase().includes(keyword);
      }

      if (searchFilters.dateFrom) {
        const fromDate = new Date(searchFilters.dateFrom);
        matchesDateRange = log.diveDate >= fromDate;
      }

      if (searchFilters.dateTo) {
        const toDate = new Date(searchFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire day
        matchesDateRange = matchesDateRange && log.diveDate <= toDate;
      }

      return matchesKeyword && matchesDateRange;
    });
  }, [logs, searchFilters]);

  const calculateNextDiveNumber = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, `profiles/${user.uid}/logbook`), 
          orderBy('diveNumber', 'desc'),
          where('diveNumber', '>', 0)
        )
      );
      
      if (!querySnapshot.empty) {
        const highestNumber = querySnapshot.docs[0].data().diveNumber;
        setNextDiveNumber(highestNumber + 1);
        setFormData(prev => ({ ...prev, diveNumber: String(highestNumber + 1) }));
      }
    } catch (error) {
      console.error('Error calculating next dive number:', error);
      setError('Failed to calculate next dive number. Please try again.');
    }
  }, [user?.uid]);

  const updateStats = useCallback((logsData) => {
    const validDepths = logsData
      .map(log => Number(log.maxDepth))
      .filter(depth => !isNaN(depth));

      const totalBottomTime = logsData.reduce((total, log) => {
        const bottomTime = log.bottomTime ? parseInt(log.bottomTime) : 0;
        return isNaN(bottomTime) ? total : total + bottomTime;
      }, 0);

      console.log('Calculating total bottom time:', { 
        logsData: logsData.map(log => log.bottomTime),
        totalBottomTime 
      });

      setStats({
        totalDives: logsData.length,
        maxDepth: validDepths.length ? Math.max(...validDepths) : 0,
        totalBottomTime: totalBottomTime,
        lastDive: logsData[0]?.diveDate || null
      });
    }, []);

  const fetchLogs = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(prev => ({ ...prev, logs: true }));
    setError('');

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
      setError('Failed to fetch dive logs. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, logs: false }));
    }
  }, [user?.uid, updateStats]);

  useEffect(() => {
    if (user?.uid) {
      fetchLogs();
      calculateNextDiveNumber();
    }
  }, [user?.uid, fetchLogs, calculateNextDiveNumber]);

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

  const handleSignature = async (e) => {
    e.preventDefault();
    setSignatureError('');
    setIsLoading(prev => ({ ...prev, signature: true }));
  
    try {
      if (!instructorSignature.pinNumber || instructorSignature.pinNumber.length !== 6) {
        throw new Error('Please enter a valid 6-digit PIN');
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
        throw new Error(verification.error || 'Invalid instructor PIN. Please try again.');
      }
    } catch (error) {
      setSignatureError(error.message);
    } finally {
      setIsLoading(prev => ({ ...prev, signature: false }));
    }
  };

  const calculateDiveTime = useCallback((timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;

    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);

    if (isNaN(inHours) || isNaN(inMinutes) || isNaN(outHours) || isNaN(outMinutes)) {
      return 0;
    }

    const totalInMinutes = inHours * 60 + inMinutes;
    const totalOutMinutes = outHours * 60 + outMinutes;

    return totalOutMinutes - totalInMinutes;
  }, []);

  const handleTimeChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      const { timeIn, timeOut } = updatedData;
      
      // Only calculate bottom time if both times are present
      if (timeIn && timeOut) {
        const diveTime = calculateDiveTime(timeIn, timeOut);
        if (diveTime > 0) {
          updatedData.bottomTime = String(diveTime);
        }
      }
      return updatedData;
    });
  }, [calculateDiveTime]);

  const validateFormData = (data) => {
    const errors = [];

    // Required fields
    if (!data.diveNumber) errors.push('Dive number is required');
    if (!data.diveDate) errors.push('Dive date is required');
    if (!data.location) errors.push('Location is required');
    if (!data.maxDepth) errors.push('Maximum depth is required');
    if (!data.bottomTime) errors.push('Bottom time is required');

    // Numeric validations
    if (data.maxDepth && Number(data.maxDepth) <= 0) {
      errors.push('Maximum depth must be greater than 0');
    }
    if (data.bottomTime && Number(data.bottomTime) <= 0) {
      errors.push('Bottom time must be greater than 0');
    }
    if (data.visibility && Number(data.visibility) < 0) {
      errors.push('Visibility cannot be negative');
    }

    // Time validations - only if both are provided
    if (data.timeIn && data.timeOut) {
      const diveTime = calculateDiveTime(data.timeIn, data.timeOut);
      if (diveTime <= 0) {
        errors.push('Time out must be after time in');
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(prev => ({ ...prev, submission: true }));
    
    try {
      validateFormData(formData);

      const logData = {
        diveNumber: parseInt(formData.diveNumber),
        diveDate: Timestamp.fromDate(new Date(formData.diveDate)),
        location: formData.location.trim(),
        buddy: formData.buddy.trim(),
        bottomTime: parseInt(formData.bottomTime),
        maxDepth: parseInt(formData.maxDepth),
        timeIn: formData.timeIn || null,
        timeOut: formData.timeOut || null,
        visibility: formData.visibility ? parseInt(formData.visibility) : null,
        airTemp: formData.airTemp ? parseInt(formData.airTemp) : null,
        waterTemp: formData.waterTemp ? parseInt(formData.waterTemp) : null,
        tankPressureStart: parseInt(formData.tankPressureStart) || null,
        tankPressureEnd: parseInt(formData.tankPressureEnd) || null,
        tankVolume: formData.tankVolume ? formData.tankVolume.trim() : null,
        diveType: formData.diveType,
        weather: {
          condition: formData.weather.condition || 'sunny',
          windSpeed: formData.weather.windSpeed ? parseInt(formData.weather.windSpeed) : null
        },
        equipment: formData.equipment,
        notes: formData.notes.trim(),
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
      await fetchLogs();
      setActiveTab(TABS.LOGBOOK);
    } catch (error) {
      console.error('Error saving log:', error);
      setError(error.message || 'Failed to save dive log. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, submission: false }));
    }
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, delete: true }));
    setError('');

    try {
      await deleteDoc(doc(db, `profiles/${user.uid}/logbook/${logId}`));
      await fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      setError('Failed to delete dive log. Please try again.');
    } finally {
      setIsLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleEdit = useCallback((log) => {
    setFormData({
      ...initialFormData,
      ...log,
      diveDate: new Date(log.diveDate).toISOString().split('T')[0],
      diveNumber: String(log.diveNumber),
      requiresSignature: log.requiresSignature || false,
      signature: log.signature || null,
      equipment: log.equipment || initialFormData.equipment,
      diveType: log.diveType || initialFormData.diveType,
      weather: log.weather || initialFormData.weather,
    });
    setEditingLog(log);
    setActiveTab(TABS.NEW_DIVE);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      ...initialFormData,
      diveNumber: String(nextDiveNumber)
    });
    setInstructorSignature(initialInstructorSignature);
    setError('');
  }, [nextDiveNumber])

  // Memoized SignatureModal component
  const SignatureModal = memo(({ isVisible }) => {
    if (!isVisible) return null;
  
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-modal-title"
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 id="signature-modal-title" className="text-lg font-semibold mb-4">
            Instructor Signature
          </h3>
          <form onSubmit={handleSignature} className="space-y-4">
            <div>
              <label 
                htmlFor="instructor-pin"
                className="block text-sm font-medium text-gray-700"
              >
                Instructor PIN
              </label>
              <input
                id="instructor-pin"
                type="text"
                inputMode="numeric"
                value={instructorSignature.pinNumber}
                onChange={(e) => setInstructorSignature(prev => ({
                  ...prev,
                  pinNumber: e.target.value.replace(/\D/g, '').slice(0, 6)
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                disabled={isLoading.signature}
                aria-describedby="pin-error"
              />
            </div>
  
            {signatureError && (
              <p id="pin-error" className="text-red-600 text-sm" role="alert">
                {signatureError}
              </p>
            )}
  
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={isLoading.signature}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                disabled={isLoading.signature}
              >
                {isLoading.signature ? 'Signing...' : 'Sign Log'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  });

  SignatureModal.displayName = 'SignatureModal';

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Global Error Display */}
        {error && (
          <div 
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" 
            role="alert"
          >
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="flex gap-4 mb-6" role="navigation" aria-label="Main navigation">
          <button
            onClick={() => setActiveTab(TABS.LOGBOOK)}
            className={`px-4 py-2 rounded-md ${
              activeTab === TABS.LOGBOOK 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-current={activeTab === TABS.LOGBOOK ? 'page' : undefined}
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
            aria-current={activeTab === TABS.STATS ? 'page' : undefined}
          >
            Quick Stats
          </button>
          <button
            onClick={() => {
              setActiveTab(TABS.NEW_DIVE);
              setEditingLog(null);
              resetForm();
            }}
            className={`px-4 py-2 rounded-md ${
              activeTab === TABS.NEW_DIVE 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-current={activeTab === TABS.NEW_DIVE ? 'page' : undefined}
          >
            New Dive
          </button>
        </nav>

        {/* Loading Indicator */}
        {isLoading.logs && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Stats View */}
        {activeTab === TABS.STATS && !isLoading.logs && (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6" role="region" aria-label="Dive statistics">
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-700">Total Dives</h3>
      <p className="text-3xl font-bold text-blue-600">{stats.totalDives}</p>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-700">Max Depth</h3>
      <p className="text-3xl font-bold text-blue-600">{stats.maxDepth} ft</p>
    </div>
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-700">Total Bottom Time</h3>
      <p className="text-3xl font-bold text-blue-600">{stats.totalBottomTime} min</p>
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
        {activeTab === TABS.LOGBOOK && !isLoading.logs && (
          <div role="region" aria-label="Dive logs">
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
                aria-label="Search dive logs"
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
                    aria-label="Filter from date"
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
                    aria-label="Filter to date"
                  />
                </div>
              </div>
            </div>

            {/* Dive Log List */}
{filteredLogs.length === 0 ? (
  <p className="text-center text-gray-600 py-8">
    No dive logs found matching your criteria.
  </p>
) : (
  <div className="space-y-4">
    {filteredLogs.map((log) => (
      <div 
        key={log.id} 
        className="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
        role="article"
        aria-label={`Dive ${log.diveNumber} at ${log.location}`}
      >
        {/* Header with Log Number, Location, and Actions */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              #{log.diveNumber} • {log.location}
              <span className="text-sm font-normal text-gray-600">
                {new Date(log.diveDate).toLocaleDateString()}
              </span>
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(log)}
              className="px-2.5 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              aria-label={`Edit dive ${log.diveNumber}`}
              disabled={isLoading.delete}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(log.id)}
              className="px-2.5 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              aria-label={`Delete dive ${log.diveNumber}`}
              disabled={isLoading.delete}
            >
              {isLoading.delete ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-gray-600">Buddy:</span>
            <span className="ml-2 font-medium">{log.buddy || 'Solo'}</span>
          </div>
          <div>
            <span className="text-gray-600">Bottom Time:</span>
            <span className="ml-2 font-medium">{log.bottomTime} min</span>
          </div>
          <div>
            <span className="text-gray-600">Max Depth:</span>
            <span className="ml-2 font-medium">{log.maxDepth} ft</span>
          </div>
          <div>
            <span className="text-gray-600">Visibility:</span>
            <span className="ml-2 font-medium">{log.visibility} ft</span>
          </div>
          <div>
            <span className="text-gray-600">Water Temp:</span>
            <span className="ml-2 font-medium">{log.waterTemp}°F</span>
          </div>
          <div>
            <span className="text-gray-600">Gas Used:</span>
            <span className="ml-2 font-medium">
              {log.tankPressureStart && log.tankPressureEnd 
                ? `${log.tankPressureStart - log.tankPressureEnd} psi`
                : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Tank Size:</span>
            <span className="ml-2 font-medium">{log.tankVolume || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600">Weather:</span>
            <span className="ml-2 font-medium capitalize">
              {log.weather?.condition}
              {log.weather?.windSpeed ? ` (${log.weather.windSpeed}kt)` : ''}
            </span>
          </div>
        </div>

        {/* Bottom Section: Dive Type, Equipment, and Notes */}
        <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Dive Type:</span>
              <span className="ml-2">
                {log.diveType && Object.entries(log.diveType)
                  .filter(([_, checked]) => checked)
                  .map(([type]) => type)
                  .join(', ') || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Equipment:</span>
              <span className="ml-2">
                {log.equipment && Object.entries(log.equipment)
                  .filter(([_, checked]) => checked)
                  .map(([gear]) => gear)
                  .join(', ') || 'None recorded'}
              </span>
            </div>
          </div>
          
          {log.notes && (
            <div className="text-gray-700 bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block mb-1">Notes:</span>
              {log.notes}
            </div>
          )}
        </div>

        {/* Signature Information (if exists) */}
        {log.signature && (
          <div className="mt-3 pt-2 border-t text-sm text-gray-600">
            ✓ Signed by {log.signature.instructorName} • {log.signature.certificationLevel} • 
            {log.signature.signatureDate && log.signature.signatureDate.toDate 
              ? log.signature.signatureDate.toDate().toLocaleDateString()
              : new Date(log.signature.signatureDate).toLocaleDateString()}
          </div>
        )}
      </div>
    ))}
  </div>
)}
          </div>
        )}

        {/* New/Edit Dive Form */}
        {activeTab === TABS.NEW_DIVE && (
          <div>
            <h2 className="text-xl font-bold mb-6">
              {editingLog ? 'Edit Dive Entry' : 'New Dive Entry'}
            </h2>
            <form onSubmit={handleSubmit}>
              {/* Warning message for signed dives */}
              {formData.signature && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This dive log is signed and cannot be edited unless the signature is removed.
                  </p>
                </div>
              )}

              {/* LogbookEntry Component */}
              <LogbookEntry
                formData={formData}
                setFormData={setFormData}
                readOnly={!!formData.signature}
                handleTimeChange={handleTimeChange}
              />

              {/* Signature Section */}
              <div className="mt-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requiresSignature"
                    checked={formData.requiresSignature}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      requiresSignature: e.target.checked 
                    }))}
                    readOnly={!!formData.signature}
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
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(TABS.LOGBOOK);
                    setEditingLog(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  disabled={isLoading.submission}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  disabled={isLoading.submission}
                >
                  {isLoading.submission 
                    ? 'Saving...' 
                    : editingLog ? 'Save Changes' : 'Add Log Entry'}
                </button>
              </div>
            </form>

            <SignatureModal isVisible={showSignatureModal} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Logbook;