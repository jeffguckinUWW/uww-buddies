import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navigation/Navbar';
import Profile from './components/Profile/Profile';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';  // Add this import
import { AuthProvider, useAuth } from './context/AuthContext';
import Logbook from './components/Logbook/Logbook';
import Training from './components/Training/Training';
import InstructorLogin from './components/Instructor/InstructorLogin';
import RequireInstructor from './components/Instructor/RequireInstructor';
import InstructorDashboard from './components/Instructor/InstructorDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdBlock from './components/AdBlock/AdBlock';

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/instructor" element={<InstructorLogin />} />
          <Route path="/register" element={<Register />} />
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
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-6">
              <AdBlock 
                ads={['/ads/ad1.jpg', '/ads/ad2.jpg']}
                interval={4000}
              />
              <AdBlock 
                ads={['/ads/ad3.jpg', '/ads/ad4.jpg']}
                interval={5000}
              />
            </div>
          } />
          <Route path="/profile" element={<Profile />} />
          <Route path="/logbook" element={<Logbook />} />
          <Route path="/training" element={<Training />} />
          <Route path="/instructor" element={<InstructorLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/instructor/dashboard" element={
            <RequireInstructor>
              <InstructorDashboard />
            </RequireInstructor>
          } />
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