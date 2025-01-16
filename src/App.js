import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navigation/Navbar';
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
import AdBlock from './components/AdBlock/AdBlock';
import ChatPage from './pages/ChatPage';
import { BuddyList } from './components/Messaging/BuddyList';
import { BuddyProfile } from './components/Messaging/BuddyProfile';

function MainContent() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    // Only check for error message when URL changes
    const errorMessage = localStorage.getItem('instructorAccessError');
    if (errorMessage) {
      setError(errorMessage);
      localStorage.removeItem('instructorAccessError');
      
      const timer = setTimeout(() => {
        setError('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]); // Only run when the path changes

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
    <div className="min-h-screen bg-gray-100">
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded shadow-lg">
          <p>{error}</p>
        </div>
      )}
      <Navbar />
      <main className="container mx-auto px-4 py-4">
        <Routes>
          <Route
            path="/"
            element={
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-6">
                <AdBlock
                  ads={[
                    { src: '/ads/ad1.jpg', link: 'https://www.diveunderwaterworld.com/module/class/510420/bonaire-july-25' },
                    { src: '/ads/ad2.jpg', link: 'https://www.diveunderwaterworld.com' },
                    { src: '/ads/ad3.jpg', link: 'https://www.diveunderwaterworld.com/module/class/407570/naui-advanced-scuba-diver-local-diving' },
                    { src: '/ads/ad4.jpg', link: 'https://www.diveunderwaterworld.com/shop/c/p/OCEANIC-DELTA-5-EDX-REGULATOR-x44838157.htm' },
                  ]}
                  interval={5000}
                  renderAd={(ad) => (
                    <a href={ad.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                      <img src={ad.src} alt="Advertisement" style={{ width: '100%', height: 'auto' }} />
                    </a>
                  )}
                />
              </div>
            }
          />
          <Route path="/profile" element={<Profile />} />
          <Route path="/buddy/:userId" element={<BuddyProfile />} />
          <Route path="/logbook" element={<Logbook />} />
          <Route path="/training" element={<Training />} />
          <Route path="/messages" element={
            <MessageProvider>
              <ChatPage />
            </MessageProvider>
          } />
          <Route path="/buddies" element={<BuddyList />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route
            path="/instructor"
            element={
              <RequireInstructor>
                <InstructorDashboard />
              </RequireInstructor>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainContent />
      </Router>
    </AuthProvider>
  );
}

export default App;