import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  // Admin check function
  const isAdmin = user?.email === 'test@test.com';

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
              <Link to="/messages" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Messages</Link>
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
            </div>
          </div>
        </div>

        {/* Mobile menu - Fixed */}
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
              <Link 
                to="/messages" 
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Messages
              </Link>
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
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;