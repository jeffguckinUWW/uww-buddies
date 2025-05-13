// src/components/Layout/Layout.js
import React, { useState, useEffect } from 'react';
import { Menu, Home, BookOpen, MessageSquare, Compass, Book, User, X, ShieldCheck, GraduationCap, Award, Users, Brain } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../Navigation/LogoutButton';
import NotificationService from '../../services/NotificationService';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    training: 0,
    travel: 0,
    buddies: 0,
    total: 0
  });

  // Check for user on mount
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Subscribe to unread notification counts
  useEffect(() => {
    if (!user) return;
    
    console.log("Setting up notification counter subscription for user:", user.uid);
    
    // Add this line to reset negative counters
    NotificationService.resetNegativeCounters(user.uid);
    
    const unsubscribe = NotificationService.subscribeToUnreadCounters(
      user.uid,
      (counts) => {
        console.log("Received updated counters:", counts);
        console.log("Buddies count:", counts.buddies);
        setUnreadCounts(counts);
      }
    );
    
    return () => unsubscribe();
  }, [user]);

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const renderMenu = () => {
    if (!isMenuOpen) return null;

    // Admin check function (matching your Navbar logic)
    const isAdmin = user?.email === 'jeff@diveuww.com';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg z-50 overflow-y-auto">
          {/* Menu Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold">Menu</h2>
            <button onClick={() => setIsMenuOpen(false)} className="p-2">
              <X size={24} />
            </button>
          </div>

          {/* Menu Items */}
          <div className="py-4">
            {/* Regular Menu Items */}
            <div className="px-4 space-y-2">
              <button
                onClick={() => handleNavigation('/profile')}
                className="flex items-center space-x-2 w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
              >
                <User size={20} />
                <span>Profile</span>
              </button>
              <button
                onClick={() => handleNavigation('/knowledge')}
                className="flex items-center space-x-2 w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
              >
                <Brain size={20} />
                <span>Knowledge Hub</span>
              </button>
              
              {/* Buddies menu item */}
              <button
                onClick={() => handleNavigation('/buddies')}
                className="flex items-center justify-between w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Users size={20} />
                  <span>Buddies</span>
                </div>
                {unreadCounts.buddies > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCounts.buddies > 9 ? '9+' : unreadCounts.buddies}
                  </span>
                )}
              </button>
            </div>

            {/* Special Access Links */}
            <div className="px-4 mt-4 pt-4 border-t">
              <button
                onClick={() => handleNavigation('/instructor')}
                className="flex items-center justify-between w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <GraduationCap size={20} className="text-blue-600" />
                  <span>Instructor Portal</span>
                </div>
                {unreadCounts.instructor > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCounts.instructor > 9 ? '9+' : unreadCounts.instructor}
                  </span>
                )}
              </button>

              {user?.loyaltyAccess?.hasAccess && (
                <button
                  onClick={() => handleNavigation('/loyalty')}
                  className="flex items-center space-x-2 w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
                >
                  <Award size={20} className="text-blue-600" />
                  <span>Loyalty Program</span>
                </button>
              )}

              {user?.teamAccess?.hasAccess && (
                <button
                  onClick={() => handleNavigation('/team')}
                  className="flex items-center space-x-2 w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
                >
                  <Users size={20} className="text-blue-600" />
                  <span>Team Portal</span>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => handleNavigation('/admin')}
                  className="flex items-center space-x-2 w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
                >
                  <ShieldCheck size={20} className="text-blue-600" />
                  <span>Admin Dashboard</span>
                </button>
              )}
            </div>

            {/* Logout Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <LogoutButton 
                className="w-full justify-start" 
                color="text-gray-700" 
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen min-h-screen-safe bg-gray-100">
      {/* Top Navigation - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-blue-600 safe-top">
        <button className="p-2 text-white relative" onClick={() => setIsMenuOpen(true)}>
          <Menu size={24} />
          {unreadCounts.total > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCounts.total > 9 ? '9+' : unreadCounts.total}
            </span>
          )}
        </button>
        <div className="flex items-center justify-center flex-1">
          <img src="/logo.png" alt="UWW Buddies Logo" className="h-8" />
        </div>
        <button className="p-2 text-white" onClick={() => handleNavigation('/profile')}>
          <User size={24} />
        </button>
      </header>

      {/* Menu Overlay */}
      {renderMenu()}

      {/* Main Content Area - With Safe Area Spacing */}
      <main className="flex-1 pt-[72px] pb-[88px] overflow-y-auto w-full smooth-scroll no-overscroll">
        {children}
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-white safe-bottom">
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/')}
        >
          <Home size={20} />
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/training' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/training')}
        >
          <div className="relative inline-flex">
            <BookOpen size={20} />
            {unreadCounts.training > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCounts.training > 9 ? '9+' : unreadCounts.training}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">Training</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/messages' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/messages')}
        >
          <div className="relative inline-flex">
            <MessageSquare size={20} />
            {unreadCounts.messages > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCounts.messages > 9 ? '9+' : unreadCounts.messages}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">Messages</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/travel' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/travel')}
        >
          <div className="relative inline-flex">
            <Compass size={20} />
            {unreadCounts.travel > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCounts.travel > 9 ? '9+' : unreadCounts.travel}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">Travel</span>
        </button>
        
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/logbook' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/logbook')}
        >
          <Book size={20} />
          <span className="text-xs mt-1">Logbook</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;