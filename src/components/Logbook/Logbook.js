import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';

const Logbook = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('logbook'); // logbook, stats, newDive
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalDives: 0,
    maxDepth: 0,
    lastDive: null
  });
  const [searchFilters, setSearchFilters] = useState({
    keyword: '',
    dateFrom: '',
    dateTo: ''
  });
  const [editingLog, setEditingLog] = useState(null);
  const [nextDiveNumber, setNextDiveNumber] = useState(1);

  const [formData, setFormData] = useState({
    diveNumber: '',
    diveDate: new Date().toISOString().split('T')[0],
    location: '',
    bottomTime: '',
    maxDepth: '',
    buddy: '',
    notes: ''
  });

  // Fetch initial data
  useEffect(() => {
    if (user?.uid) {
      fetchLogs();
      calculateNextDiveNumber();
    }
  }, [user]);

  // Calculate next dive number
  const calculateNextDiveNumber = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, `profiles/${user.uid}/logbook`), orderBy('diveNumber', 'desc')),
      );
      if (!querySnapshot.empty) {
        const highestNumber = querySnapshot.docs[0].data().diveNumber;
        setNextDiveNumber(highestNumber + 1);
      }
    } catch (error) {
      console.error('Error calculating next dive number:', error);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, `profiles/${user.uid}/logbook`), orderBy('diveDate', 'desc'))
      );
      
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

  // Update stats
  const updateStats = (logsData) => {
    const stats = {
      totalDives: logsData.length,
      maxDepth: Math.max(...logsData.map(log => log.maxDepth), 0),
      lastDive: logsData[0]?.diveDate || null
    };
    setStats(stats);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const logData = {
        diveNumber: parseInt(formData.diveNumber),
        diveDate: Timestamp.fromDate(new Date(formData.diveDate)),
        location: formData.location,
        bottomTime: parseInt(formData.bottomTime),
        maxDepth: parseInt(formData.maxDepth),
        buddy: formData.buddy,
        notes: formData.notes
      };

      if (editingLog) {
        await setDoc(doc(db, `profiles/${user.uid}/logbook/${editingLog.id}`), logData);
      } else {
        await addDoc(collection(db, `profiles/${user.uid}/logbook`), logData);
      }

      setEditingLog(null);
      resetForm();
      fetchLogs();
      setActiveTab('logbook');
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  // Delete log entry
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

  // Edit log entry
  const handleEdit = (log) => {
    setFormData({
      diveNumber: log.diveNumber,
      diveDate: new Date(log.diveDate).toISOString().split('T')[0],
      location: log.location,
      bottomTime: log.bottomTime,
      maxDepth: log.maxDepth,
      buddy: log.buddy,
      notes: log.notes
    });
    setEditingLog(log);
    setActiveTab('newDive');
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      diveNumber: nextDiveNumber,
      diveDate: new Date().toISOString().split('T')[0],
      location: '',
      bottomTime: '',
      maxDepth: '',
      buddy: '',
      notes: ''
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('logbook')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'logbook' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            View Logbook
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'stats' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Quick Stats
          </button>
          <button
            onClick={() => {
              setActiveTab('newDive');
              if (!editingLog) resetForm();
            }}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'newDive' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {editingLog ? 'Edit Dive' : 'New Dive'}
          </button>
        </div>

        {/* Quick Stats Panel */}
        {activeTab === 'stats' && (
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

        {/* Logbook Panel */}
        {activeTab === 'logbook' && (
          <div>
            {/* Search Filters */}
            <div className="mb-6 flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search by location or notes"
                className="flex-1 min-w-[200px] px-3 py-2 border rounded-md"
                value={searchFilters.keyword}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, keyword: e.target.value }))}
              />
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm text-gray-600">From</label>
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md"
                    value={searchFilters.dateFrom}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">To</label>
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md"
                    value={searchFilters.dateTo}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Logs List */}
            <div className="space-y-4">
              {logs.map((log) => (
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Dive Form */}
        {activeTab === 'newDive' && (
          <div>
            <h2 className="text-xl font-bold mb-6">
              {editingLog ? 'Edit Dive Entry' : 'New Dive Entry'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dive Number</label>
                  <input
                    type="number"
                    value={formData.diveNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, diveNumber: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.diveDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, diveDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bottom Time (minutes)</label>
                  <input
                    type="number"
                    value={formData.bottomTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, bottomTime: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Depth (feet)</label>
                  <input
                    type="number"
                    value={formData.maxDepth}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDepth: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Dive Buddy</label>
                <input
                  type="text"
                  value={formData.buddy}
                  onChange={(e) => setFormData(prev => ({ ...prev, buddy: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('logbook');
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
      </div>
    </div>
  );
};

export default Logbook;