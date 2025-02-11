// src/components/Navigation/LogoutButton.js
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const LogoutButton = ({ className = '', color = 'text-white' }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors duration-150 ${color} ${className}`}
    >
      <LogOut size={18} />
      <span>Logout</span>
    </button>
  );
};

export default LogoutButton;