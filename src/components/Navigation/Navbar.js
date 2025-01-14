import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from './LogoutButton';
import NotificationCenter from '../Messaging/shared/NotificationCenter';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Bell } from 'lucide-react';


function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user } = useAuth();

  // Admin check function
  const isAdmin = user?.email === 'test@test.com';

  // Track unread notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('toUser', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const NotificationBell = () => {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNotifications(!showNotifications);
          }}
          className="relative px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
          aria-label="Notifications"
        >
          <Bell className="h-6 w-6" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </button>
  
        {showNotifications && (
          <div className="fixed inset-0 z-[100]">
            <NotificationCenter onClose={() => setShowNotifications(false)} />
          </div>
        )}
      </div>
    );
  };

  const messageItems = (isMobile = false) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700";
    const mobileClasses = "block";
    
    return (
      <div className={`${isMobile ? 'block' : 'flex items-center space-x-4'}`}>
        <Link 
          to="/buddies" 
          className={`${isMobile ? mobileClasses : ''} ${baseClasses}`}
          onClick={() => setIsMenuOpen(false)}
        >
          Buddies
        </Link>
        
        <Link 
          to="/messages" 
          className={`${isMobile ? mobileClasses : ''} ${baseClasses}`}
          onClick={() => setIsMenuOpen(false)}
        >
          Messages
        </Link>
        
        <NotificationBell />
      </div>
    );
  };
  
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 font-bold text-xl">
            UWW Buddies
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:justify-between md:flex-1">
            <div className="flex items-baseline space-x-4 ml-10">
              <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Home</Link>
              <Link to="/logbook" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Logbook</Link>
              <Link to="/training" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Training</Link>
              {messageItems()}
              <Link to="/profile" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Profile</Link>
            </div>
            {/* Instructor and Admin Links - Desktop */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/instructor" 
                className="text-gray-300 text-sm hover:text-white px-3 py-2 rounded-md transition-colors duration-150"
              >
                Instructor Portal
              </Link>
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="text-gray-300 text-sm hover:text-white px-3 py-2 rounded-md transition-colors duration-150"
                >
                  Admin
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-600">
              <Link 
                to="/" 
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/logbook" 
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Logbook
              </Link>
              <Link 
                to="/training" 
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Training
              </Link>
              {messageItems(true)}
              <Link 
                to="/profile" 
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile
              </Link>
              <div className="border-t border-blue-700 mt-2 pt-2">
                <Link 
                  to="/instructor" 
                  className="block px-3 py-2 text-gray-300 hover:text-white text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Instructor Portal
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="block px-3 py-2 text-gray-300 hover:text-white text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <div className="mt-2">
                  <LogoutButton className="w-full justify-center" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;