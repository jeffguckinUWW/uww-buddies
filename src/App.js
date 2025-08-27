import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Profile from './components/Profile/Profile';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import EmailVerification from './components/Auth/EmailVerification';
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
import RequireTeamAccess from './components/Team/RequireTeamAccess';
import TeamPortal from './components/Team/TeamPortal';
import HomePage from './pages/Home';
import Layout from './components/Layout/Layout';
import RewardsPage from './pages/RewardsPage';
import Travel from './pages/Travel';
import KnowledgePage from './pages/KnowledgePage';
import LearningResources from './components/Knowledge/LearningResources';
import ResourceViewer from './components/Knowledge/ResourceViewer';
import { getVerificationSetting } from './utils/verificationSettings';
import NotificationService from './services/NotificationService';

// Mobile viewport height fix component
function ViewportHeightFix() {
  useEffect(() => {
    const setAppHeight = () => {
      // Get viewport height and set custom property
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initially and on resize
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    
    // Re-calculate on orientation change for iOS
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure iOS has completed its UI adjustments
      setTimeout(setAppHeight, 200);
    });
    
    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);
  
  return null;
}

// Push notification initialization component - now using NotificationService
function PushNotificationInitializer() {
  const { user } = useAuth();
  
  useEffect(() => {
    // Only initialize push notifications when user is authenticated
    if (user) {
      console.log('User authenticated, initializing push notifications...');
      NotificationService.initPushNotifications()
        .then(() => {
          console.log('Push notifications initialized successfully');
        })
        .catch(error => {
          console.error('Error initializing push notifications:', error);
        });
    }
  }, [user]);
  
  return null;
}

function AuthRoutes() {
  const location = useLocation();
  const [error, setError] = useState('');
  const { user } = useAuth();
  const requireEmailVerification = getVerificationSetting();
  
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
  
  // If email verification is required and email is not verified, redirect to verification page
  if (requireEmailVerification && user && !user.emailVerified) {
    return <Navigate to="/verify-email" />;
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
        <Route path="/travel" element={<Travel />} />
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
        <Route 
          path="/team" 
          element={
            <RequireTeamAccess>
              <TeamPortal />
            </RequireTeamAccess>
          } 
        />
        <Route path="/knowledge/*" element={<KnowledgePage />} />
        <Route path="/knowledge/resources" element={<LearningResources />} />
        <Route path="/knowledge/resources/:resourceId" element={<ResourceViewer />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

function MainContent() {
  const { user } = useAuth();
  const requireEmailVerification = getVerificationSetting();
  console.log("Current user state:", user);
  console.log("Current path:", window.location.pathname);
  console.log("Email verification required:", requireEmailVerification);

  // If user is not logged in, show login, register, or forgot password pages
  if (!user) {
    return (
      <div className="min-h-screen-safe bg-gray-100 smooth-scroll">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </div>
    );
  }

  // If email verification is required, user is logged in but needs to verify
  if (requireEmailVerification && user && !user.emailVerified) {
    return (
      <Routes>
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="*" element={<Navigate to="/verify-email" />} />
      </Routes>
    );
  }

  // Show protected routes
  return <AuthRoutes />;
}

function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <Router>
          {/* Add viewport height fix component */}
          <ViewportHeightFix />
          {/* Initialize push notifications when user is authenticated */}
          <PushNotificationInitializer />
          <div className="no-tap-highlight smooth-scroll no-overscroll">
            <MainContent />
          </div>
        </Router>
      </MessageProvider>
    </AuthProvider>
  );
}

export default App;