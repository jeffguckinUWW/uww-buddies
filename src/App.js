import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navigation/Navbar';
import Profile from './components/Profile/Profile';
import Login from './components/Auth/Login';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Logbook from './components/Logbook/Logbook';
import InstructorLogin from './components/Instructor/InstructorLogin';
import RequireInstructor from './components/Instructor/RequireInstructor';
import InstructorDashboard from './components/Instructor/InstructorDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/instructor" element={<InstructorLogin />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="container mx-auto px-4 py-4">
        <Routes>
          <Route path="/" element={
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Welcome to UWW Buddies
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Connect with fellow underwater enthusiasts and track your diving journey!
              </p>
            </div>
          } />
          <Route path="/profile" element={<Profile />} />
          <Route path="/logbook" element={<Logbook />} />
          <Route path="/instructor" element={<InstructorLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/instructor/dashboard" element={<RequireInstructor> <InstructorDashboard /> </RequireInstructor>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;