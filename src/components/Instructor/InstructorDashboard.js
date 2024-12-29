import React from 'react';
import { useAuth } from '../../context/AuthContext';

const InstructorDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Instructor Dashboard</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Courses</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">No active courses yet.</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Students</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">No students enrolled yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;