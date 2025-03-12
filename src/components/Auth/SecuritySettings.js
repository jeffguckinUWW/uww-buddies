import React, { useState } from 'react';
import ChangePassword from './ChangePassword';  // Fix the import path to use the right casing

function SecuritySettings() {
  const [activeTab, setActiveTab] = useState('password');

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
      
      <div className="border-b border-gray-200 mb-6">
        <ul className="flex -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium focus:outline-none ${
                activeTab === 'password'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('password')}
            >
              Password
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium focus:outline-none ${
                activeTab === 'sessions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('sessions')}
            >
              Active Sessions
            </button>
          </li>
        </ul>
      </div>
      
      {activeTab === 'password' && (
        <ChangePassword />
      )}
      
      {activeTab === 'sessions' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This is your current active session.
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            For security reasons, you can't view all your active sessions. If you suspect unauthorized access to your account, change your password immediately and log out of all sessions.
          </p>
          <div className="mt-4">
            <button
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Log Out All Other Sessions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecuritySettings;