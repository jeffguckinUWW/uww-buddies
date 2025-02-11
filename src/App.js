import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Profile from './components/Profile/Profile';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MessageProvider } from './context/MessageContext';
import Logbook from './components/Logbook/Logbook';
import Training from './components/Training/Training';
import RequireInstructor from './components/Instructor/RequireInstructor';
import InstructorDashboard from './components/Instructor/InstructorDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import ChatPage from './pages/ChatPage';
import { BuddyList } from './components/Messaging/BuddyList';
import { BuddyProfile } from './components/Messaging/BuddyProfile';
import LoyaltyDashboard from './components/Loyalty/LoyaltyDashboard';
import RequireLoyaltyAccess from './components/Loyalty/RequireLoyaltyAccess';
import HomePage from './pages/Home';
import Layout from './components/Layout/Layout';
import RewardsPage from './pages/RewardsPage';

function MainContent() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const errorMessage = localStorage.getItem('instructorAccessError');
    if (errorMessage) {
      setError(errorMessage);
      localStorage.removeItem('instructorAccessError');
      
      const timer = setTimeout(() => {
        setError('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    );
  }

  return (
    <Layout>
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded shadow-lg">
          <p>{error}</p>
        </div>
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/buddy/:userId" element={<BuddyProfile />} />
        <Route path="/logbook" element={<Logbook />} />
        <Route path="/training" element={<Training />} />
        <Route path="/messages" element={<ChatPage />} />
        <Route path="/buddies" element={<BuddyList />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route
          path="/instructor"
          element={
            <RequireInstructor>
              <InstructorDashboard />
            </RequireInstructor>
          }
        />
        <Route 
          path="/loyalty" 
          element={
            <RequireLoyaltyAccess>
              <LoyaltyDashboard />
            </RequireLoyaltyAccess>
          } 
        />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <Router>
          <MainContent />
        </Router>
      </MessageProvider>
    </AuthProvider>
  );
}

export default App;