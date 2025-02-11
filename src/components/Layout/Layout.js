// src/components/Layout/Layout.js
import React, { useState, useEffect } from 'react';
import { Menu, Home, BookOpen, MessageSquare, Compass, Book, User, X, ShieldCheck, GraduationCap, Award } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../Navigation/LogoutButton';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check for user on mount
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const renderMenu = () => {
    if (!isMenuOpen) return null;

    // Admin check function (matching your Navbar logic)
    const isAdmin = user?.email === 'test@test.com';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg z-50">
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
            </div>

            {/* Special Access Links */}
            <div className="px-4 mt-4 pt-4 border-t">
              <button
                onClick={() => handleNavigation('/instructor')}
                className="flex items-center space-x-2 w-full px-2 py-2 text-left hover:bg-gray-100 rounded-lg"
              >
                <GraduationCap size={20} className="text-blue-600" />
                <span>Instructor Portal</span>
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
    <div className="flex flex-col h-screen">
      {/* Top Navigation - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-blue-600">
        <button className="p-2 text-white" onClick={() => setIsMenuOpen(true)}>
          <Menu size={24} />
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

      {/* Main Content Area - With Padding for Fixed Headers */}
      <main className="flex-1 overflow-y-auto pt-16 pb-16">
        {children}
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-white">
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
          <BookOpen size={20} />
          <span className="text-xs mt-1">Training</span>
        </button>
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/messages' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/messages')}
        >
          <MessageSquare size={20} />
          <span className="text-xs mt-1">Messages</span>
        </button>
        <button 
          className={`flex flex-col items-center p-2 ${location.pathname === '/travel' ? 'text-blue-600' : 'text-gray-600'}`}
          onClick={() => handleNavigation('/travel')}
        >
          <Compass size={20} />
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